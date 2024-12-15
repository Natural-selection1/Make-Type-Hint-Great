import type { SyntaxNode, Tree } from 'tree-sitter';
import { TextDocument } from 'vscode';
import { AST4Import } from './ASTtools/ASTAutoImport';
import { AST4Init } from './ASTtools/ASTInit';
import type { AST, ImportNode, ImportStatementNode } from './types';

export class ASTService extends AST4Init {
    private ast4Import: AST4Import | null = null;

    // #region 此处委托给ASTAutoImport
    public findAllImports(): SyntaxNode[] {
        if (!this.tree || !this.ast4Import) return [];
        return this.ast4Import.findAllImports(this.tree.rootNode);
    }

    public findTypingImport(ast: AST, typeName: string): ImportNode | null {
        return this.ast4Import?.findTypingImport(ast, typeName) || null;
    }

    public findTypingImportStatement(ast: AST): ImportStatementNode | null {
        return this.ast4Import?.findTypingImportStatement(ast) || null;
    }

    public addTypeToImport(importNode: ImportStatementNode, typeName: string): string {
        return this.ast4Import?.addTypeToImport(importNode, typeName) || '';
    }

    public getImportedTypes(importStatement: ImportStatementNode): string[] {
        return this.ast4Import?.getImportedTypes(importStatement) || [];
    }
    //#endregion

    /**
     * 解析源代码
     */
    public override parseCode(sourceCode: string): Tree {
        const tree = super.parseCode(sourceCode);
        this.ast4Import = new AST4Import();
        this.ast4Import.parseCode(sourceCode);
        return tree;
    }
    /**
     * 解析文档
     */
    public override async parseDocument(document: TextDocument): Promise<AST> {
        return super.parseDocument(document);
    }

    /**
     * 查找所有类定义
     */
    public findAllClassDefinitions(): SyntaxNode[] {
        return this.findNodes(node => node.type === 'class_definition');
    }

    /**
     * 获取指定位置的函数定义
     */
    public getFunctionDefinitionAt(line: number, character: number): SyntaxNode | null {
        const node = this.getNodeAtPosition(line, character);
        if (!node) return null;

        const funcNode = node.closest('function_definition');
        return funcNode || null;
    }

    /**
     * 分析变量声明
     */
    public analyzeVariableDeclaration(
        line: number,
        character: number
    ): {
        name: string;
        type?: string;
        value?: string;
    } | null {
        const node = this.getNodeAtPosition(line, character);
        if (!node) return null;

        const assignment = node.closest('assignment');
        if (!assignment) return null;

        const identifier = assignment.children.find(child => child.type === 'identifier');
        const typeAnnotation = assignment.children.find(child => child.type === 'type');
        const value = assignment.children.find(
            child => !['identifier', 'type', '='].includes(child.type)
        );

        return identifier
            ? {
                  name: identifier.text,
                  type: typeAnnotation?.text,
                  value: value?.text,
              }
            : null;
    }

    /**
     * 获取类的基类列表
     */
    public getBaseClasses(node: SyntaxNode): string[] {
        const baseClasses: string[] = [];
        const argumentList = node.children.find(child => child.type === 'argument_list');

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
     * 检查节点是否有特定的基类
     */
    public hasBaseClass(node: SyntaxNode, baseClassName: string): boolean {
        const bases = node.children.find((child: SyntaxNode) => child.type === 'argument_list');
        if (!bases) return false;

        return bases.children.some(
            (base: SyntaxNode) => base.type === 'identifier' && base.text === baseClassName
        );
    }

    /**
     * 获取方法的参数列表
     */
    public getMethodParams(node: SyntaxNode): string[] {
        const params: string[] = [];
        const paramList = node.children.find((child: SyntaxNode) => child.type === 'parameters');

        if (paramList) {
            for (const param of paramList.children) {
                if (param.type === 'identifier') {
                    params.push(param.text);
                }
            }
        }

        return params;
    }

    /**
     * 获取返回类型注解
     */
    public getReturnType(node: SyntaxNode): string | undefined {
        const returnType = node.children.find(
            (child: SyntaxNode) => child.type === 'type_annotation'
        );

        return returnType?.children[0]?.text;
    }

    /**
     * 检查节点是否有特定的类型注解
     */
    public hasTypeAnnotation(node: SyntaxNode, typeName: string): boolean {
        const typeAnnotation = node.children.find(
            (child: SyntaxNode) => child.type === 'type_annotation'
        );

        return typeAnnotation?.children[0]?.text === typeName;
    }

    /**
     * 获取字面量值列表
     */
    public getLiteralValues(node: SyntaxNode): (string | number | boolean)[] {
        const values: (string | number | boolean)[] = [];
        const literalList = node.children.find(
            (child: SyntaxNode) => child.type === 'list' || child.type === 'tuple'
        );

        if (literalList) {
            for (const value of literalList.children) {
                if (value.type === 'string') {
                    values.push(value.text);
                } else if (value.type === 'number') {
                    values.push(Number(value.text));
                } else if (value.type === 'true' || value.type === 'false') {
                    values.push(value.type === 'true');
                }
            }
        }

        return values;
    }

    /**
     * 查找所有 TypeVar 节点
     */
    public findTypeVarNodes(): SyntaxNode[] {
        return this.findNodes((node: SyntaxNode) => {
            if (node.type !== 'call') return false;

            // 检查是否是 TypeVar 调用
            const funcName = node.children.find(
                (child: SyntaxNode) => child.type === 'identifier'
            )?.text;

            return funcName === 'TypeVar';
        });
    }
}
