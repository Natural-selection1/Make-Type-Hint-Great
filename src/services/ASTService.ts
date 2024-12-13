import type Parser from 'tree-sitter';
import type { SyntaxNode, Tree } from 'tree-sitter';
import { TextDocument } from 'vscode';
import type { AST, ImportNode, ImportStatementNode } from './types';

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

    /**
     * 解析文档
     */
    public async parseDocument(document: TextDocument): Promise<AST> {
        const sourceCode = document.getText();
        return this.parseCode(sourceCode);
    }

    /**
     * 查找typing模块中特定类型的导入
     */
    public findTypingImport(ast: AST, typeName: string): ImportNode | null {
        const imports = this.findAllImports();
        return imports.find(node => {
            if (node.type !== 'import_from_statement') return false;
            const moduleNode = node.children.find(child => child.type === 'dotted_name');
            if (moduleNode?.text !== 'typing') return false;

            const importedNames = node.children
                .filter(child => child.type === 'dotted_name')
                .map(child => child.text);

            return importedNames.includes(typeName);
        }) as ImportNode || null;
    }

    /**
     * 查找typing模块的导入语句
     */
    public findTypingImportStatement(ast: AST): ImportStatementNode | null {
        const imports = this.findAllImports();
        const typingImport = imports.find(node => {
            if (node.type !== 'import_from_statement') return false;
            const moduleNode = node.children.find(child => child.type === 'dotted_name');
            return moduleNode?.text === 'typing';
        });

        if (!typingImport) return null;

        return {
            ...typingImport,
            start: typingImport.startIndex,
            end: typingImport.endIndex
        } as ImportStatementNode;
    }

    /**
     * 在现有导入语句中添加新类型
     */
    public addTypeToImport(importNode: ImportStatementNode, typeName: string): string {
        const importText = this.sourceCode.slice(importNode.start, importNode.end);
        const importParts = importText.split('import');
        if (importParts.length !== 2) return importText;

        const [fromPart, namesPart] = importParts;
        const names = namesPart.trim().split(',').map(n => n.trim());
        names.push(typeName);

        return `${fromPart}import ${names.join(', ')}`;
    }
}