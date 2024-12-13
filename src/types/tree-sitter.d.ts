declare module 'tree-sitter' {
    export default class Parser {
        constructor();
        parse(input: string): Tree;
        setLanguage(language: any): void;
    }

    export type { SyntaxNode, Tree };

    export interface SyntaxNode {
        type: string;
        text: string;
        children: SyntaxNode[];
        descendantForPosition(position: {row: number, column: number}): SyntaxNode | null;
        closest(type: string): SyntaxNode | null;
    }

    export interface Tree {
        rootNode: SyntaxNode;
    }
}

declare module 'tree-sitter-python' {
    const language: any;
    export = language;
}