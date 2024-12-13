import { CompletionItem, CompletionItemKind, TextDocument, TextEdit, Range } from 'vscode';
import {
    BuiltinTypes,
    TypingTypes,
    getBuiltInTypeContainer,
    getTypingTypeContainer,
    TypeCategory,
} from './BaseTypes';
import { TypeHintSettings } from './settings';

/**
 * 基础类型处理中间件
 * 提供处理Python类型提示的通用功能
 */
export class BaseTypeProcess {
    protected settings: TypeHintSettings;
    protected itemSortPrefix: number;

    constructor(settings: TypeHintSettings, itemSortPrefix: number = 90) {
        this.settings = settings;
        this.itemSortPrefix = itemSortPrefix;
    }

    /**
     * 获取类型的来源信息
     */
    protected getTypeSource(typeName: string): string {
        const cleanTypeName = typeName.replace(/\[\]$/, '').replace('typing.', '');
        return Object.values(TypingTypes).includes(cleanTypeName as TypingTypes)
            ? '[typing]'
            : '[builtin]';
    }

    /**
     * 为类型提示生成标签
     */
    protected labelFor(typeHint: string): string {
        return ' ' + typeHint;
    }

    /**
     * 在文件开头添加导入语句
     */
    protected addImportEdit(item: CompletionItem, typeName: string, document: TextDocument) {
        if (!Object.values(TypingTypes).includes(typeName as TypingTypes)) {
            return;
        }

        const additionalTextEdits: TextEdit[] = [];
        const docText = document.getText();

        const fromTypingImportRegex = new RegExp(
            `^\\s*from\\s+typing\\s+import\\s+[^\\n]*\\b${typeName}\\b`,
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
            additionalTextEdits.push(new TextEdit(range, `${importLine}, ${typeName}`));
        } else {
            additionalTextEdits.push(
                new TextEdit(new Range(0, 0, 0, 0), `from typing import ${typeName}\n`)
            );
        }

        item.additionalTextEdits = additionalTextEdits;
    }

    /**
     * 创建新的自动完成项
     */
    public newCompletionItem(
        hint: string,
        sortTextPrefix: string,
        document: TextDocument
    ): CompletionItem {
        const item = new CompletionItem(this.labelFor(hint), CompletionItemKind.TypeParameter);
        item.sortText = sortTextPrefix + hint;
        item.detail = this.getTypeSource(hint);
        (item as any).document = document;

        if (item.detail === '[typing]') {
            const typeName = hint.replace('typing.', '').replace(/\[\]$/, '');
            this.addImportEdit(item, typeName, document);
        }

        return item;
    }

    /**
     * 创建一个被选中的自动完成项
     */
    public selectedCompletionItem(
        typeHint: string,
        sortTextPrefix: string = '0b',
        document: TextDocument
    ): CompletionItem {
        let item = new CompletionItem(this.labelFor(typeHint), CompletionItemKind.TypeParameter);
        item.sortText = `${sortTextPrefix}${typeHint}`;
        item.preselect = true;
        item.detail = this.getTypeSource(typeHint);
        (item as any).document = document;

        if (item.detail === '[typing]') {
            const typeName = typeHint.replace('typing.', '').replace(/\[\]$/, '');
            this.addImportEdit(item, typeName, document);
        }

        return item;
    }

    /**
     * 获取内置类型的提示
     */
    public getBuiltinHints(document: TextDocument): CompletionItem[] {
        const items: CompletionItem[] = [];
        const sortTextPrefix = this.itemSortPrefix.toString();

        Object.values(BuiltinTypes).forEach((typeName: string) => {
            const type = getBuiltInTypeContainer()[typeName];
            const hint =
                this.settings.appendBrackets && type.category === TypeCategory.Refinable
                    ? `${typeName}[`
                    : typeName;
            items.push(this.newCompletionItem(hint, sortTextPrefix, document));
        });

        return items;
    }

    /**
     * 获取typing模块的类型提示
     */
    public getTypingHints(document: TextDocument): CompletionItem[] {
        const items: CompletionItem[] = [];
        const sortTextPrefix = (this.itemSortPrefix + 1).toString();

        Object.values(TypingTypes).forEach((typeName: string) => {
            const type = getTypingTypeContainer()[typeName];
            const hint =
                this.settings.appendBrackets && type.category === TypeCategory.Refinable
                    ? `${typeName}[`
                    : typeName;
            items.push(this.newCompletionItem(hint, sortTextPrefix, document));
        });

        return items;
    }

    /**
     * 将类型提示添加到自动完成项数组
     */
    public pushHintsToItems(
        typeHints: string[],
        completionItems: CompletionItem[],
        firstItemSelected: boolean,
        document: TextDocument
    ) {
        const sortTextPrefix = this.itemSortPrefix.toString();

        completionItems.push(
            firstItemSelected
                ? this.selectedCompletionItem(typeHints[0], '0b', document)
                : this.newCompletionItem(typeHints[0], sortTextPrefix, document)
        );

        for (let i = 1; i < typeHints.length; i++) {
            completionItems.push(this.newCompletionItem(typeHints[i], sortTextPrefix, document));
        }
    }
}
