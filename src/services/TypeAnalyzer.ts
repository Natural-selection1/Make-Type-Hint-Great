import { ASTService } from './ASTService';
import type { SyntaxNode } from 'tree-sitter';
import { DataType, TypeCategory, getBaseType } from '../typeData/BaseTypes';

interface ImportResult {
    className: string;
    source: string;
    alias?: string;
}

export class TypeAnalyzer {
    private astService: ASTService;

    constructor(astService: ASTService) {
        this.astService = astService;
    }

    /**
     * 分析函数参数类型
     */
    public analyzeFunctionParameters(position: { line: number; character: number }): {
        paramName: string;
        existingType?: string;
    } | null {
        const node = this.astService.getNodeAtPosition(position.line, position.character);
        if (!node) return null;

        // 查找最近的函数定义节点
        const funcNode = node.closest('function_definition');
        if (!funcNode) return null;

        // 查找参数列表
        const parameters = funcNode.children.find(child => child.type === 'parameters');
        if (!parameters) return null;

        // 遍历参数找到当前位置的参数
        for (const param of parameters.children) {
            if (param.type === 'identifier') {
                const startPos = param.startPosition;
                if (startPos.row === position.line) {
                    return {
                        paramName: param.text,
                        existingType: this.getExistingParameterType(param),
                    };
                }
            }
        }

        return null;
    }

    /**
     * 获取参数的现有类型注解
     */
    private getExistingParameterType(paramNode: SyntaxNode): string | undefined {
        const parentNode = paramNode.parent;
        if (!parentNode) return undefined;

        const typeNode = parentNode.children.find(
            (child: SyntaxNode) => child.type === 'type' || child.type === 'annotation'
        );
        return typeNode?.text;
    }

    /**
     * 分析自定义类型
     */
    public analyzeCustomTypes(): DataType[] {
        const customTypes: DataType[] = [];
        const classNodes = this.astService.findAllClassDefinitions();

        for (const node of classNodes) {
            // 获取类名
            const nameNode = node.children.find(child => child.type === 'identifier');
            if (nameNode) {
                // 分析类的继承关系
                const baseClasses = this.analyzeBaseClasses(node);

                // 确定类型分类
                const category = this.determineTypeCategory(node, baseClasses);

                // 创建自定义类型
                customTypes.push(new DataType(nameNode.text as any, category));
            }
        }

        return customTypes;
    }

    /**
     * 分析类的基类
     */
    private analyzeBaseClasses(classNode: SyntaxNode): string[] {
        const baseClasses: string[] = [];
        const argumentList = classNode.children.find(child => child.type === 'argument_list');

        if (argumentList) {
            for (const child of argumentList.children) {
                if (child.type === 'identifier') {
                    baseClasses.push(child.text);
                }
            }
        }

        return baseClasses;
    }

    /**
     * 确定类型的分类
     */
    private determineTypeCategory(classNode: SyntaxNode, baseClasses: string[]): TypeCategory {
        // 检查是否继承自已知的可细化类型
        const refinableBaseTypes = ['List', 'Dict', 'Set', 'Tuple', 'Sequence', 'Mapping'];
        if (baseClasses.some(base => refinableBaseTypes.includes(base))) {
            return TypeCategory.Refinable;
        }

        // 检查类的方法和属性以确定是否可细化
        const hasGenericMethods = this.hasGenericMethods(classNode);
        return hasGenericMethods ? TypeCategory.Refinable : TypeCategory.NonRefinable;
    }

    /**
     * 检查类是否包含泛型方法
     */
    private hasGenericMethods(classNode: SyntaxNode): boolean {
        const functionDefs = classNode.children.filter(
            child => child.type === 'function_definition'
        );

        return functionDefs.some(func => {
            const typeParameters = func.children.find(child => child.type === 'type_parameters');
            return !!typeParameters;
        });
    }

    /**
     * 分析导入语句中的类
     * @returns 找到的类名及其来源
     */
    public analyzeImports(): ImportResult[] {
        const results: ImportResult[] = [];
        const importNodes = this.astService.findAllImports();

        for (const node of importNodes) {
            if (node.type === 'import_statement') {
                this.analyzeImportStatement(node, results);
            } else if (node.type === 'import_from_statement') {
                this.analyzeFromImportStatement(node, results);
            }
        }

        return results;
    }

    private analyzeImportStatement(node: SyntaxNode, results: ImportResult[]) {
        for (const child of node.children) {
            if (child.type === 'dotted_name') {
                const className = child.text.split('.').pop() || '';
                if (this.isClassName(className)) {
                    results.push({
                        className,
                        source: child.text,
                    });
                }
            }
        }
    }

    private analyzeFromImportStatement(node: SyntaxNode, results: ImportResult[]) {
        const moduleNode = node.children.find(child => child.type === 'dotted_name');
        const importedNames = node.children.find(child => child.type === 'import_list');

        if (importedNames && moduleNode) {
            const modulePath = moduleNode.text;

            for (const name of importedNames.children) {
                if (name.type === 'aliased_import') {
                    const originalName =
                        name.children.find(child => child.type === 'identifier')?.text || '';
                    const aliasName = name.children
                        .find(child => child.type === 'alias')
                        ?.children.find(child => child.type === 'identifier')?.text;

                    if (this.isClassName(originalName)) {
                        results.push({
                            className: originalName,
                            source: modulePath,
                        });
                        if (aliasName && this.isClassName(aliasName)) {
                            results.push({
                                className: aliasName,
                                source: modulePath,
                            });
                        }
                    }
                } else if (name.type === 'identifier') {
                    const className = name.text;
                    if (this.isClassName(className)) {
                        results.push({
                            className,
                            source: modulePath,
                        });
                    }
                }
            }
        }
    }

    /**
     * 判断一个标识符是否为类名
     */
    public isClassName(name: string): boolean {
        return /^[A-Z]/.test(name);
    }

    public analyzeTypeAliases() {
        // 分析类型别名定义
        const assignments = this.astService.findNodes(
            (node: SyntaxNode) => node.type === 'assignment'
        );
        return assignments
            .filter(node => this.isTypeAlias(node))
            .map(node => ({
                name: this.getAssignmentTarget(node),
                originalType: this.getAssignmentValue(node),
            }));
    }

    public analyzeTypeVars() {
        // 分析TypeVar定义
        const typeVarCalls = this.astService
            .findNodes((node: SyntaxNode) => node.type === 'call')
            .filter(node => this.isTypeVarDefinition(node));

        return typeVarCalls.map(node => ({
            name: this.getTypeVarName(node),
            constraints: this.getTypeVarConstraints(node),
        }));
    }

    private getAssignmentTarget(node: SyntaxNode): string {
        return node.children.find(child => child.type === 'identifier')?.text || '';
    }

    private getAssignmentValue(node: SyntaxNode): string {
        return node.children.find(child => child.type === 'expression')?.text || '';
    }

    private getTypeVarName(node: SyntaxNode): string {
        return node.children.find(child => child.type === 'identifier')?.text || '';
    }

    private getTypeVarConstraints(node: SyntaxNode): string[] {
        return []; // 实现获取约束的逻辑
    }

    private isTypeAlias(node: SyntaxNode): boolean {
        return node.type === 'assignment' && this.isTypeAliasPattern(node);
    }

    private isTypeVarDefinition(node: SyntaxNode): boolean {
        return node.type === 'call' && this.isTypeVarPattern(node);
    }

    private isTypeAliasPattern(node: SyntaxNode): boolean {
        // 实现类型别名模式检查
        return true;
    }

    private isTypeVarPattern(node: SyntaxNode): boolean {
        // 实现 TypeVar 模式检查
        return true;
    }

    /**
     * 分析协议类型定义
     * @returns 协议类型数组
     */
    public analyzeProtocols(): Array<{
        name: string;
        methods: {
            [key: string]: {
                params: string[];
                returnType: string;
            };
        };
    }> {
        const protocols: Array<{
            name: string;
            methods: {
                [key: string]: {
                    params: string[];
                    returnType: string;
                };
            };
        }> = [];

        // 查找所有Protocol类定义
        const protocolNodes = this.astService.findNodes(
            (node: SyntaxNode) =>
                node.type === 'class_definition' && this.astService.hasBaseClass(node, 'Protocol')
        );

        for (const node of protocolNodes) {
            const nameNode = node.children.find(child => child.type === 'identifier');
            if (!nameNode) continue;

            const methods: {
                [key: string]: {
                    params: string[];
                    returnType: string;
                };
            } = {};

            // 分析协议中的方法定义
            const methodNodes = this.astService.findNodes(
                (child: SyntaxNode) => child.type === 'function_definition',
                node
            );

            for (const methodNode of methodNodes) {
                const methodName = methodNode.children.find(
                    child => child.type === 'identifier'
                )?.text;
                if (!methodName) continue;

                // 分析方法参数
                const params = this.astService.getMethodParams(methodNode);
                // 分析返回类型
                const returnType = this.astService.getReturnType(methodNode);

                methods[methodName] = {
                    params,
                    returnType: returnType || 'Any',
                };
            }

            protocols.push({
                name: nameNode.text,
                methods,
            });
        }

        return protocols;
    }

    /**
     * 分析字面量类型定义
     * @returns 字面量类型数组
     */
    public analyzeLiteralTypes(): Array<{
        name: string;
        values: (string | number | boolean)[];
    }> {
        const literals: Array<{
            name: string;
            values: (string | number | boolean)[];
        }> = [];

        // 查找所有Literal类型定义
        const literalNodes = this.astService.findNodes(
            (node: SyntaxNode) =>
                node.type === 'assignment' && this.astService.hasTypeAnnotation(node, 'Literal')
        );

        for (const node of literalNodes) {
            const nameNode = node.children.find(child => child.type === 'identifier');
            if (!nameNode) continue;

            // 解析字面量值
            const values = this.astService.getLiteralValues(node);
            if (values.length > 0) {
                literals.push({
                    name: nameNode.text,
                    values,
                });
            }
        }

        return literals;
    }
}
