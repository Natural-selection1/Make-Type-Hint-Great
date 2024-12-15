import { CompletionItem, TextDocument, TextEdit, Range } from 'vscode';
import { TypingTypes } from '../typeData/BaseTypes';
import { ASTService } from '../services/ASTService';
import { ASTAutoImport } from '../services/ASTtools/ASTAutoImpore';

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
        const astAutoImport = new ASTAutoImport(astService, document.getText());

        // 检查是否已经存在typing导入
        const existingImport = astAutoImport.findTypingImport(ast, cleanName);
        if (existingImport) {
            return;
        }

        const additionalTextEdits: TextEdit[] = [];

        // 查找现有的typing导入语句
        const existingTypingImport = astAutoImport.findTypingImportStatement(ast);

        if (existingTypingImport) {
            const range = new Range(
                document.positionAt(existingTypingImport.start),
                document.positionAt(existingTypingImport.end)
            );

            const currentText = document.getText(range);

            if (currentText.includes('(\n')) {
                const lines = currentText.split('\n');
                lines.splice(1, 0, `    ${cleanName},`);
                const newImportText = lines.join('\n');
                additionalTextEdits.push(new TextEdit(range, newImportText));
            } else {
                const importNames = astAutoImport.getImportedTypes(existingTypingImport);
                importNames.unshift(cleanName);

                const newImportText =
                    'from typing import (\n' +
                    importNames.map(name => `    ${name},`).join('\n') +
                    '\n)';

                additionalTextEdits.push(new TextEdit(range, newImportText));
            }
        } else {
            additionalTextEdits.push(
                new TextEdit(new Range(0, 0, 0, 0), `from typing import ${cleanName}\n`)
            );
        }

        item.additionalTextEdits = additionalTextEdits;
    }
}
