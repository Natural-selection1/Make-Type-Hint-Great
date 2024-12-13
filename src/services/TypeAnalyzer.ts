import { ASTService } from './ASTService';
import type { SyntaxNode } from 'tree-sitter';
import { DataType, TypeCategory, getDataTypeContainer } from '../typeData/BaseTypes';

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
                        existingType: this.getExistingParameterType(param)
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

        const typeNode = parentNode.children.find((child: SyntaxNode) =>
            child.type === 'type' || child.type === 'annotation'
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
        const functionDefs = classNode.children.filter(child =>
            child.type === 'function_definition'
        );

        return functionDefs.some(func => {
            const typeParameters = func.children.find(child =>
                child.type === 'type_parameters'
            );
            return !!typeParameters;
        });
    }

    /**
     * 分析导入语句中的类
     * @returns 找到的类名及其来源
     */
    public analyzeImports(): { className: string; source: string }[] {
        const results: { className: string; source: string }[] = [];
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

    private analyzeImportStatement(node: SyntaxNode, results: { className: string; source: string }[]) {
        for (const child of node.children) {
            if (child.type === 'dotted_name') {
                const className = child.text.split('.').pop() || '';
                if (this.isClassName(className)) {
                    results.push({
                        className,
                        source: child.text
                    });
                }
            }
        }
    }

    private analyzeFromImportStatement(node: SyntaxNode, results: { className: string; source: string }[]) {
        const moduleNode = node.children.find(child => child.type === 'dotted_name');
        const importedNames = node.children.find(child => child.type === 'import_list');

        if (importedNames && moduleNode) {
            const modulePath = moduleNode.text;

            for (const name of importedNames.children) {
                if (name.type === 'aliased_import') {
                    const originalName = name.children.find(child =>
                        child.type === 'identifier')?.text || '';
                    const aliasName = name.children.find(child =>
                        child.type === 'alias')?.children.find(child =>
                            child.type === 'identifier')?.text;

                    if (this.isClassName(originalName)) {
                        results.push({
                            className: originalName,
                            source: modulePath
                        });
                        if (aliasName && this.isClassName(aliasName)) {
                            results.push({
                                className: aliasName,
                                source: modulePath
                            });
                        }
                    }
                } else if (name.type === 'identifier') {
                    const className = name.text;
                    if (this.isClassName(className)) {
                        results.push({
                            className,
                            source: modulePath
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
}