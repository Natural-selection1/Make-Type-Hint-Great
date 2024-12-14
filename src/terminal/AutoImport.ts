import { CompletionItem, TextDocument, TextEdit, Range } from 'vscode';
import { TypingTypes } from '../typeData/BaseTypes';
import { ASTService } from '../services/ASTService';

export class AutoImport {
    /**
     * 清理类型名称
     * @param typeName 类型名称
     * @param options 清理选项
     * @returns 清理后的类型名称
     */
    private static cleanTypeName(
        typeName: string,
        options: {
            removeBrackets?: boolean;
            removeTypingPrefix?: boolean;
        } = {
            removeBrackets: true,
            removeTypingPrefix: false,
        }
    ): string {
        let cleanName = typeName;
        if (options.removeBrackets) {
            cleanName = cleanName.replace(/\[?\]?$/, '');
        }
        if (options.removeTypingPrefix) {
            cleanName = cleanName.replace('typing.', '');
        }
        return cleanName;
    }

    /**
     * 添加类型导入语句
     * @param item CompletionItem实例
     * @param typeName 类型名称
     * @param document 当前文档
     */
    public static async addImportEdit(
        item: CompletionItem,
        typeName: string,
        document: TextDocument
    ) {
        const cleanName = this.cleanTypeName(typeName);

        if (!Object.values(TypingTypes).includes(cleanName as TypingTypes)) {
            return;
        }

        const astService = new ASTService();
        const ast = await astService.parseDocument(document);

        // 检查是否已经存在typing导入
        const existingImport = astService.findTypingImport(ast, cleanName);
        if (existingImport) {
            return;
        }

        const additionalTextEdits: TextEdit[] = [];

        // 查找现有的typing导入语句
        const existingTypingImport = astService.findTypingImportStatement(ast);

        if (existingTypingImport) {
            // 在现有的typing导入中添加新类型
            const range = new Range(
                document.positionAt(existingTypingImport.start),
                document.positionAt(existingTypingImport.end)
            );
            const newImportText = astService.addTypeToImport(existingTypingImport, cleanName);
            additionalTextEdits.push(new TextEdit(range, newImportText));
        } else {
            // 添加新的typing导入语句
            additionalTextEdits.push(
                new TextEdit(new Range(0, 0, 0, 0), `from typing import ${cleanName}\n`)
            );
        }

        item.additionalTextEdits = additionalTextEdits;
    }
}
