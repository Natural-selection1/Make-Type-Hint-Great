import {
    CompletionItem,
    CompletionItemKind,
    TextDocument,
    TextEdit,
    Range,
    SnippetString,
} from 'vscode';
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
     * 清理类型名称，移除前缀和后缀
     *
     * @param typeName 原始类型名称
     * @param options 清理选项
     * - removeBrackets: 是否移除方括号
     * - removeTypingPrefix: 是否移除typing.前缀
     * @returns 清理后的类型名称
     */
    protected cleanTypeName(
        typeName: string,
        options: {
            removeBrackets?: boolean;
            removeTypingPrefix?: boolean;
        } = {
            removeBrackets: true,
            removeTypingPrefix: true,
        }
    ): string {
        let cleanName = typeName;
        // 移除方括号(如果需要)
        if (options.removeBrackets) {
            cleanName = cleanName.replace(/\[?\]?$/, '');
        }
        // 移除typing.前缀(如果需要)
        if (options.removeTypingPrefix) {
            cleanName = cleanName.replace('typing.', '');
        }
        return cleanName;
    }

    /**
     * 获取类型的来源信息
     * @param typeName 类型名称
     * @returns 类型来源标记('[typing]'或'[builtin]')
     */
    protected getTypeSource(typeName: string): string {
        const cleanName = this.cleanTypeName(typeName);
        return Object.values(TypingTypes).includes(cleanName as TypingTypes)
            ? '[typing]'
            : '[builtin]';
    }

    /**
     * 为类型提示生成标签
     * @param typeHint 类型提示文本
     * @returns 格式化后的标签
     */
    protected labelFor(typeHint: string): string {
        return ' ' + typeHint;
    }

    /**
     * 在文件开头添加导入语句
     *
     * @param item CompletionItem实例
     * @param typeName 类型名称
     * @param document 当前文档
     */
    protected addImportEdit(item: CompletionItem, typeName: string, document: TextDocument) {
        // 清理类型名称
        const cleanName = this.cleanTypeName(typeName, {
            removeBrackets: true,
            removeTypingPrefix: false,
        });

        // 如果不是typing模块的类型，直接返回
        if (!Object.values(TypingTypes).includes(cleanName as TypingTypes)) {
            return;
        }

        const additionalTextEdits: TextEdit[] = [];
        const docText = document.getText();

        // 检查是否已存在相应的导入语句
        const fromTypingImportRegex = new RegExp(
            `^\\s*from\\s+typing\\s+import\\s+[^\\n]*\\b${cleanName}\\b`,
            'm'
        );
        if (fromTypingImportRegex.test(docText)) {
            return;
        }

        // 检查是否存在其他typing导入语句
        const existingImportRegex = /^(\s*from\s+typing\s+import\s+[^{\n]+?)(?:\n|$)/m;
        const match = existingImportRegex.exec(docText);

        if (match) {
            // 如果存在，在现有导入语句中添加新类型
            const importLine = match[1];
            const range = new Range(
                document.positionAt(match.index),
                document.positionAt(match.index + importLine.length)
            );
            additionalTextEdits.push(new TextEdit(range, `${importLine}, ${cleanName}`));
        } else {
            // 如果不存在，创建新的导入语句
            additionalTextEdits.push(
                new TextEdit(new Range(0, 0, 0, 0), `from typing import ${cleanName}\n`)
            );
        }

        item.additionalTextEdits = additionalTextEdits;
    }

    /**
     * 创建基础的自动完成项
     *
     * @param hint 类型提示文本
     * @param sortTextPrefix 排序前缀
     * @param document 当前文档
     * @param isPreselected 是否预选中此项
     * @returns 创建的CompletionItem实例
     */
    private createBaseCompletionItem(
        hint: string,
        sortTextPrefix: string,
        document: TextDocument,
        isPreselected: boolean = false
    ): CompletionItem {
        // 创建新的自动完成项
        const item = new CompletionItem(this.labelFor(hint), CompletionItemKind.TypeParameter);
        // 设置排序文本
        item.sortText = `${sortTextPrefix}${hint}`;
        // 设置详细信息(类型来源)
        item.detail = this.getTypeSource(hint);
        // 设置是否预选中
        item.preselect = isPreselected;
        // 保存文档引用
        (item as any).document = document;

        // 如果是typing模块的类型,添加导入语句
        if (item.detail === '[typing]') {
            const typeName = this.cleanTypeName(hint);
            this.addImportEdit(item, typeName, document);
        }

        return item;
    }

    /**
     * 创建新的自动完成项
     *
     * @param hint 类型提示文本
     * @param sortTextPrefix 排序前缀
     * @param document 当前文档
     * @returns 创建的CompletionItem实例
     */
    public newCompletionItem(
        hint: string,
        sortTextPrefix: string,
        document: TextDocument
    ): CompletionItem {
        // 如果类型以[]结尾,创建带有占位符的snippet
        if (hint.endsWith('[]')) {
            const item = this.createBaseCompletionItem(hint, sortTextPrefix, document);
            item.insertText = new SnippetString(`${hint.slice(0, -2)}[$1]`);
            return item;
        }

        return this.createBaseCompletionItem(hint, sortTextPrefix, document);
    }

    /**
     * 创建一个被选中的自动完成项
     *
     * @param typeHint 类型提示文本
     * @param sortTextPrefix 排序前缀,默认为'0b'
     * @param document 当前文档
     * @returns 创建的CompletionItem实例
     */
    public selectedCompletionItem(
        typeHint: string,
        sortTextPrefix: string = '0b',
        document: TextDocument
    ): CompletionItem {
        return this.createBaseCompletionItem(typeHint, sortTextPrefix, document, true);
    }

    /**
     * 获取内置类型的提示
     *
     * @param document 当前文档
     * @returns 内置类型的自动完成项数组
     */
    public getBuiltinHints(document: TextDocument): CompletionItem[] {
        const items: CompletionItem[] = [];
        const sortTextPrefix = this.itemSortPrefix.toString();

        // 遍历所有内置类型
        Object.values(BuiltinTypes).forEach((typeName: string) => {
            const type = getBuiltInTypeContainer()[typeName];
            // 根据设置决定是否添加方括号
            // 如果类型是可细化的且设置了appendBrackets，则添加[]
            const hint =
                this.settings.appendBrackets && type.category === TypeCategory.Refinable
                    ? `${typeName}[]`
                    : typeName;
            items.push(this.newCompletionItem(hint, sortTextPrefix, document));
        });

        return items;
    }

    /**
     * 获取typing模块的类型提示
     *
     * @param document 当前文档
     * @returns typing模块类型的自动完成项数组
     */
    public getTypingHints(document: TextDocument): CompletionItem[] {
        const items: CompletionItem[] = [];
        // 排序前缀加1，确保typing类型排在内置类型后面
        const sortTextPrefix = (this.itemSortPrefix + 1).toString();

        // 遍历所有typing模块类型
        Object.values(TypingTypes).forEach((typeName: string) => {
            const type = getTypingTypeContainer()[typeName];
            // 根据设置决定是否添加方括号
            // 如果类型是可细化的且设置了appendBrackets，则添加[]
            const hint =
                this.settings.appendBrackets && type.category === TypeCategory.Refinable
                    ? `${typeName}[]`
                    : typeName;
            items.push(this.newCompletionItem(hint, sortTextPrefix, document));
        });

        return items;
    }

    /**
     * 将类型提示添加到自动完成项数组
     *
     * @param typeHints 类型提示数组
     * @param completionItems 目标自动完成项数组
     * @param firstItemSelected 是否选中第一项
     * @param document 当前文档
     */
    public pushHintsToItems(
        typeHints: string[],
        completionItems: CompletionItem[],
        firstItemSelected: boolean,
        document: TextDocument
    ) {
        const sortTextPrefix = this.itemSortPrefix.toString();

        // 添加第一个类型提示
        // 如果firstItemSelected为true，则创建一个被选中的项
        // 否则创建普通的自动完成项
        completionItems.push(
            firstItemSelected
                ? this.selectedCompletionItem(typeHints[0], '0b', document)
                : this.newCompletionItem(typeHints[0], sortTextPrefix, document)
        );

        // 添加剩余的类型提示
        // 从索引1开始，因为第一项已经添加
        for (let i = 1; i < typeHints.length; i++) {
            completionItems.push(this.newCompletionItem(typeHints[i], sortTextPrefix, document));
        }
    }
}
