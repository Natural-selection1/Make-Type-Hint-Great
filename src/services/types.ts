import type { SyntaxNode } from 'tree-sitter';

export interface AST {
    rootNode: SyntaxNode;
}

export interface ImportNode extends SyntaxNode {
    type: 'import_from_statement';
    text: string;
}

export interface ImportStatementNode extends ImportNode {
    start: number;
    end: number;
}
