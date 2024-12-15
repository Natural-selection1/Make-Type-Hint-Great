import type { SyntaxNode } from 'tree-sitter';
import type { AST, ImportNode, ImportStatementNode } from '../types';
import { AST4Init } from './ASTInit';

export class AST4Import extends AST4Init {
    /**
     * 查找typing模块中特定类型的导入
     */
    public findTypingImport(ast: AST, typeName: string): ImportNode | null {
        const imports = this.findAllImports(ast.rootNode);
        return (
            (imports.find(node => {
                if (node.type !== 'import_from_statement') return false;
                const moduleNode = node.children.find(child => child.type === 'dotted_name');
                if (moduleNode?.text !== 'typing') return false;

                const importedNames = node.children
                    .filter(child => child.type === 'dotted_name')
                    .map(child => child.text);

                return importedNames.includes(typeName);
            }) as ImportNode) || null
        );
    }

    /**
     * 查找typing模块的导入语句
     */
    public findTypingImportStatement(ast: AST): ImportStatementNode | null {
        const imports = this.findAllImports(ast.rootNode);
        const typingImport = imports.find(node => {
            if (node.type !== 'import_from_statement') return false;
            const moduleNode = node.children.find(child => child.type === 'dotted_name');
            return moduleNode?.text === 'typing';
        });

        if (!typingImport) return null;

        return {
            ...typingImport,
            start: typingImport.startIndex,
            end: typingImport.endIndex,
        } as ImportStatementNode;
    }

    /**
     * 获取所有导入语句
     */
    public findAllImports(rootNode: SyntaxNode): SyntaxNode[] {
        return this.findNodes(
            node => node.type === 'import_statement' || node.type === 'import_from_statement',
            rootNode
        );
    }

    /**
     * 在现有导入语句中添加新类型
     */
    public addTypeToImport(importNode: ImportStatementNode, typeName: string): string {
        const importText = this.sourceCode.slice(importNode.start, importNode.end);
        const importParts = importText.split('import');
        if (importParts.length !== 2) return importText;

        const [fromPart, namesPart] = importParts;
        const names = namesPart
            .trim()
            .split(',')
            .map(n => n.trim());
        names.push(typeName);

        return `${fromPart}import ${names.join(', ')}`;
    }

    /**
     * 获取导入语句中的所有类型名称
     */
    public getImportedTypes(importStatement: ImportStatementNode): string[] {
        const importText = this.sourceCode.slice(importStatement.start, importStatement.end);
        const match = importText.match(/from\s+typing\s+import\s+([\s\S]+)$/);
        if (!match) return [];

        const importPart = match[1]
            .replace(/[\(\)]/g, '')
            .replace(/\s*,\s*/g, ',')
            .replace(/\n\s*/g, '')
            .trim();

        return importPart.split(',').filter((name: string) => name.length > 0);
    }
}
