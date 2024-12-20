import type Parser from 'tree-sitter';
import type { SyntaxNode, Tree } from 'tree-sitter';
import { TextDocument } from 'vscode';
import { ASTInit } from './ASTtools/ASTInit';
import type { AST, ImportNode, ImportStatementNode } from './types';

export class ASTService {
    private parser: Parser;
    private tree: Tree | null = null;
    private sourceCode: string = '';

    constructor() {
        this.parser = ASTInit.initParser();
    }

    /**
     * 解析源代码
     */
    public parseCode(sourceCode: string): Tree {
        this.sourceCode = sourceCode;
        this.tree = this.parser.parse(sourceCode);
        return this.tree;
    }

    /**
     * 获取指定位置的节点
     */
    public getNodeAtPosition(line: number, character: number): SyntaxNode | null {
        if (!this.tree) return null;

        return this.tree.rootNode.descendantForPosition({
            row: line,
            column: character,
        });
    }

    /**
     * 查找所有类定义
     */
    public findAllClassDefinitions(): SyntaxNode[] {
        if (!this.tree) return [];

        const classes: SyntaxNode[] = [];
        this.traverseTree(this.tree.rootNode, node => {
            if (node.type === 'class_definition') {
                classes.push(node);
            }
        });
        return classes;
    }

    /**
     * 遍历语法树
     */
    private traverseTree(node: SyntaxNode, callback: (node: SyntaxNode) => void) {
        callback(node);
        for (const child of node.children) {
            this.traverseTree(child, callback);
        }
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
     * 获取所有导入语句
     */
    public findAllImports(): SyntaxNode[] {
        if (!this.tree) return [];

        const imports: SyntaxNode[] = [];
        this.traverseTree(this.tree.rootNode, node => {
            if (node.type === 'import_statement' || node.type === 'import_from_statement') {
                imports.push(node);
            }
        });
        return imports;
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
     * 解析文档
     */
    public async parseDocument(document: TextDocument): Promise<AST> {
        const sourceCode = document.getText();
        return this.parseCode(sourceCode);
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
     * 查找指定类型的所有节点
     * @param predicate 节点匹配条件
     * @param parent 可选的父节点
     */
    public findNodes(predicate: (node: SyntaxNode) => boolean, parent?: SyntaxNode): SyntaxNode[] {
        if (!this.tree) return [];

        const nodes: SyntaxNode[] = [];
        const rootNode = parent || this.tree.rootNode;

        this.traverseTree(rootNode, node => {
            if (predicate(node)) {
                nodes.push(node);
            }
        });

        return nodes;
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

        // 直接遍历所有子节点获取值
        for (const child of node.children) {
            if (
                child.type === 'string' ||
                child.type === 'number' ||
                child.type === 'true' ||
                child.type === 'false'
            ) {
                values.push(child.text);
            }
        }

        return values;
    }
}
