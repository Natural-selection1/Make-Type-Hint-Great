import { ASTService } from './ASTService';
import type { SyntaxNode } from 'tree-sitter';
import { DataType } from '../BaseTypes';

export class TypeAnalyzer {
    private astService: ASTService;

    constructor(astService: ASTService) {
        this.astService = astService;
    }

    /**
     * 分析函数参数类型
     */
    public analyzeFunctionParameters(position: { line: number; character: number }): {
        paramName: string;
        existingType?: string;
    } | null {
        const node = this.astService.getNodeAtPosition(position.line, position.character);
        if (!node) return null;

        const funcNode = node.closest('function_definition');
        if (!funcNode) return null;

        // 分析参数和类型
        // ...

        return null;
    }

    /**
     * 分析自定义类型
     */
    public analyzeCustomTypes(): DataType[] {
        const customTypes: DataType[] = [];
        const classNodes = this.astService.findAllClassDefinitions();

        for (const node of classNodes) {
            // 分析类定义并创建DataType对象
            // ...
        }

        return customTypes;
    }
}