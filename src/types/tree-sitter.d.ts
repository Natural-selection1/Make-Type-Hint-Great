declare module 'tree-sitter' {
    export default class Parser {
        constructor();
        parse(input: string): Tree;
        setLanguage(language: any): void;
    }

    export interface Point {
        row: number;
        column: number;
    }

    export interface SyntaxNode {
        type: string;
        text: string;
        children: SyntaxNode[];
        parent: SyntaxNode | null;
        startPosition: Point;
        endPosition: Point;
        startIndex: number;
        endIndex: number;
        descendantForPosition(position: Point): SyntaxNode | null;
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