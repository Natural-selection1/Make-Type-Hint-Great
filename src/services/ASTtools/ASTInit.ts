import type Parser from 'tree-sitter';

export class ASTInit {
    /**
     * 初始化tree-sitter解析器
     */
    public static initParser(): Parser {
        try {
            const Parser = require('tree-sitter');
            const Python = require('tree-sitter-python');

            const parser = new Parser();
            parser.setLanguage(Python);
            return parser;
        } catch (error) {
            console.error('Failed to initialize tree-sitter:', error);
            // 提供后备方案
            return {
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
}
