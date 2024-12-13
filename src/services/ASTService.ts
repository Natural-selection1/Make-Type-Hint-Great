import type Parser from 'tree-sitter';
import type { SyntaxNode, Tree } from 'tree-sitter';

export class ASTService {
    private parser: Parser;
    private tree: Tree | null = null;
    private sourceCode: string = '';

    constructor() {
        try {
            const Parser = require('tree-sitter');
            const Python = require('tree-sitter-python');

            this.parser = new Parser();
            this.parser.setLanguage(Python);
        } catch (error) {
            console.error('Failed to initialize tree-sitter:', error);
            // 提供后备方案
            this.parser = {
                parse: () => ({
                    rootNode: {
                        text: '',
                        type: '',
                        children: [],
                        closest: () => null,
                        descendantForPosition: () => null
                    }
                })
            } as any;
        }
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
            column: character
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
    public analyzeVariableDeclaration(line: number, character: number): {
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
        const value = assignment.children.find(child =>
            !['identifier', 'type', '='].includes(child.type)
        );

        return identifier ? {
            name: identifier.text,
            type: typeAnnotation?.text,
            value: value?.text
        } : null;
    }
}