import {
    CompletionItem,
    TextDocument,
    TextEdit,
    Range,
} from 'vscode';
import { TypingTypes } from '../BaseTypes';

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
    public static addImportEdit(item: CompletionItem, typeName: string, document: TextDocument) {
        const cleanName = this.cleanTypeName(typeName);

        if (!Object.values(TypingTypes).includes(cleanName as TypingTypes)) {
            return;
        }

        const additionalTextEdits: TextEdit[] = [];
        const docText = document.getText();

        const fromTypingImportRegex = new RegExp(
            `^\\s*from\\s+typing\\s+import\\s+[^\\n]*\\b${cleanName}\\b`,
            'm'
        );
        if (fromTypingImportRegex.test(docText)) {
            return;
        }

        const existingImportRegex = /^(\s*from\s+typing\s+import\s+[^{\n]+?)(?:\n|$)/m;
        const match = existingImportRegex.exec(docText);

        if (match) {
            const importLine = match[1];
            const range = new Range(
                document.positionAt(match.index),
                document.positionAt(match.index + importLine.length)
            );
            additionalTextEdits.push(new TextEdit(range, `${importLine}, ${cleanName}`));
        } else {
            additionalTextEdits.push(
                new TextEdit(new Range(0, 0, 0, 0), `from typing import ${cleanName}\n`)
            );
        }

        item.additionalTextEdits = additionalTextEdits;
    }
}
