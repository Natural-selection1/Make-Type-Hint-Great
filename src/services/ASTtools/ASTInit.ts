import type Parser from 'tree-sitter';
import type { SyntaxNode, Tree } from 'tree-sitter';
import { TextDocument } from 'vscode';
import type { AST } from '../types';

export class AST4Init {
    protected parser: Parser;
    protected tree: Tree | null = null;
    protected sourceCode: string = '';

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
                        descendantForPosition: () => null,
                    },
                }),
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
            column: character,
        });
    }

    /**
     * 遍历语法树
     */
    protected traverseTree(node: SyntaxNode, callback: (node: SyntaxNode) => void) {
        callback(node);
        for (const child of node.children) {
            this.traverseTree(child, callback);
        }
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
     * 解析文档
     */
    public async parseDocument(document: TextDocument): Promise<AST> {
        const sourceCode = document.getText();
        return this.parseCode(sourceCode);
    }

    /**
     * 获取当前源代码
     */
    public getSourceCode(): string {
        return this.sourceCode;
    }

    /**
     * 获取当前语法树
     */
    public getTree(): Tree | null {
        return this.tree;
    }
}
