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
            if (node.type === 'import_from_statement') {
                const moduleNode = node.children.find(child => child.type === 'dotted_name');
                const importList = node.children.find(child => child.type === 'import_list');

                if (moduleNode && importList) {
                    const modulePath = moduleNode.text;

                    for (const importItem of importList.children) {
                        if (importItem.type === 'identifier') {
                            const name = importItem.text;
                            // 检查是否是类型相关的导入
                            if (this.isClassName(name) || this.isTypingRelated(name, modulePath)) {
                                results.push({
                                    className: name,
                                    source: modulePath,
                                });
                            }
                        }
                    }
                }
            }
        }

        return results;
    }

    /**
     * 判断是否为类名（首字母大写）
     */
    private isClassName(name: string): boolean {
        return /^[A-Z]/.test(name);
    }

    /**
     * 判断是否是 typing 相关的类型
     */
    private isTypingRelated(name: string, modulePath: string): boolean {
        const typingModules = ['typing', 'collections.abc', 'types'];
        if (typingModules.includes(modulePath)) {
            return true;
        }

        // 其他可能的类型相关模块
        const typeRelatedModules = ['abc', 'dataclasses', 'enum'];
        return typeRelatedModules.includes(modulePath);
    }

    /**
     * 分析类型变量定义
     */
    public analyzeTypeVars() {
        const typeVars: { name: string; constraints: string[] }[] = [];
        const nodes = this.astService.findTypeVarNodes();

        for (const node of nodes) {
            // 获取赋值语句的左侧（变量名）
            const assignmentNode = node.parent;
            if (assignmentNode?.type !== 'assignment') continue;

            const nameNode = assignmentNode.children.find(
                (child: SyntaxNode) => child.type === 'identifier'
            );
            if (!nameNode || !nameNode.text) continue;

            const name = nameNode.text.trim();
            if (!name) continue;

            // 获取 TypeVar 的约束条件
            const constraints = this.getTypeVarConstraints(node);
            typeVars.push({ name, constraints });
        }

        return typeVars;
    }

    /**
     * 分析类型别名定义
     */
    public analyzeTypeAliases() {
        const assignments = this.astService.findNodes(
            (node: SyntaxNode) => node.type === 'assignment'
        );

        return assignments
            .filter(node => {
                // 只处理模块级别的赋值
                if (node.parent?.type !== 'module') return false;

                const target = this.getAssignmentTarget(node);
                if (!target) return false;

                // 获取赋值的右侧表达式
                const valueNode = node.children.find(child => child.type === 'expression');
                if (!valueNode) return false;

                // 检查是否是类型别名定义
                return this.isTypeAliasDefinition(valueNode);
            })
            .map(node => ({
                name: this.getAssignmentTarget(node),
                originalType: this.getAssignmentValue(node),
            }));
    }

    /**
     * 判断是否是类型别名定义
     */
    private isTypeAliasDefinition(node: SyntaxNode): boolean {
        const text = node.text;

        // 检查是否使用了类型相关的标识符
        const typePatterns = [
            'Literal[',
            'Union[',
            'Dict[',
            'List[',
            'Callable[',
            'Optional[',
            'Sequence[',
            'Mapping[',
            'Set[',
            'Tuple[',
            'Type[',
            'Any',
            'TypeVar(',
        ];

        return typePatterns.some(pattern => text.includes(pattern));
    }

    /**
     * 获取 TypeVar 的约束条件
     */
    private getTypeVarConstraints(node: SyntaxNode): string[] {
        const constraints: string[] = [];
        const args = node.children.find(child => child.type === 'argument_list');

        if (args) {
            // 跳过第一个参数（TypeVar 的名称）
            const constraintNodes = args.children.slice(1);
            for (const constraintNode of constraintNodes) {
                if (constraintNode.type === 'identifier') {
                    constraints.push(constraintNode.text);
                }
            }
        }

        return constraints;
    }

    private getAssignmentTarget(node: SyntaxNode): string {
        return node.children.find(child => child.type === 'identifier')?.text || '';
    }

    private getAssignmentValue(node: SyntaxNode): string {
        return node.children.find(child => child.type === 'expression')?.text || '';
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
