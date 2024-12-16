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

    /**
     * 分析类型别名定义
     * @returns 类型别名、字面量类型和类型变量的分析结果
     */
    public collectTypeDefinitions(): {
        aliases: Array<{ name: string; originalType: string }>;
        literals: Array<{ name: string; values: (string | number | boolean)[] }>;
        typeVars: Array<{ name: string; constraints: string[] }>;
    } {
        const aliases: Array<{ name: string; originalType: string }> = [];
        const literals: Array<{ name: string; values: (string | number | boolean)[] }> = [];
        const typeVars: Array<{ name: string; constraints: string[] }> = [];

        // 查找所有赋值语句
        const assignments = this.astService.findNodes(
            (node: SyntaxNode) => node.type === 'assignment'
        );

        for (const node of assignments) {
            // 获取左侧的变量名
            const nameNode = node.children.find(child => child.type === 'identifier');
            if (!nameNode) continue;

            // 获取右侧的表达式
            const rightSide = node.children.find(
                child => child.type === 'call' || child.type === 'subscript'
            );

            if (!rightSide) continue;

            // 忽略基础类型名称
            const baseTypeNode = rightSide.children.find(child => child.type === 'identifier');
            if (!baseTypeNode) continue;

            const baseTypeName = baseTypeNode.text;

            // 处理Literal类型
            if (baseTypeName === 'Literal') {
                const values = this.astService.getLiteralValues(rightSide);
                if (values.length > 0) {
                    literals.push({
                        name: nameNode.text,
                        values,
                    });
                }
                continue;
            }

            // 处理TypeVar类型
            if (baseTypeName === 'TypeVar') {
                const constraints = this.analyzeTypeVarConstraints(rightSide);
                typeVars.push({
                    name: nameNode.text,
                    constraints,
                });
                continue;
            }

            // 检查是否是可细化类型
            const isRefinableType = this.isRefinableBaseType(baseTypeName);
            if (!isRefinableType) {
                continue;
            }

            // 获取完整的类型表达式
            const originalType = rightSide.text;
            aliases.push({
                name: nameNode.text,
                originalType,
            });
        }

        return { aliases, literals, typeVars };
    }

    /**
     * 分析TypeVar的约束条件
     */
    private analyzeTypeVarConstraints(node: SyntaxNode): string[] {
        const constraints: string[] = [];

        // 查找参数列表
        const argList = node.children.find(child => child.type === 'argument_list');
        if (!argList) return constraints;

        // 跳过第一个参数(TypeVar名称)
        const args = argList.children.slice(1);

        for (const arg of args) {
            if (arg.type === 'identifier') {
                constraints.push(arg.text);
            }
        }

        return constraints;
    }

    /**
     * 判断是否为可细化的基础类型
     */
    private isRefinableBaseType(typeName: string): boolean {
        // 从BaseTypes中获取类型信息
        const builtinType = getBaseType()[typeName];

        // 检查类型是否存在且为可细化类型
        return builtinType?.category === TypeCategory.Refinable;
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
}
