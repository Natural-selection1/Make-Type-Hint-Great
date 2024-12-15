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
    getBuiltinType,
    getTypingType,
    TypeCategory,
} from '../typeData/BaseTypes';
import { TypeHintSettings } from '../settings';
import { AutoImport } from '../terminal/AutoImport';
import { TypeCache } from './TypeCache';

/**
 * 基础类型处理中间件
 * 提供处理Python类型提示的通用功能
 *
 * 主要功能:
 * - 处理内置类型和typing模块类型的提示
 * - 管理类型提示的格式化和显示
 * - 处理类型导入语句
 * - 支持类型提示的排序和选中状态
 * - 支持可细化类型的方括号添加
 */
export class BaseTypeProcess {
    protected settings: TypeHintSettings;
    protected itemSortPrefix: number;
    protected typeCache: TypeCache;

    constructor(settings: TypeHintSettings, itemSortPrefix: number = 90) {
        this.settings = settings;
        this.itemSortPrefix = itemSortPrefix;
        this.typeCache = TypeCache.getInstance();
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
        AutoImport.addImportEdit(item, typeName, document);
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
     * 获取内置类型的提示(添加缓存)
     */
    public getBuiltinHints(document: TextDocument): CompletionItem[] {
        return this.typeCache.getOrCreate('builtin', document, () => {
            const items: CompletionItem[] = [];
            const sortTextPrefix = this.itemSortPrefix.toString();

            Object.values(BuiltinTypes).forEach((typeName: string) => {
                const type = getBuiltinType()[typeName];
                const hint =
                    this.settings.appendBrackets && type.category === TypeCategory.Refinable
                        ? `${typeName}[]`
                        : typeName;
                items.push(this.newCompletionItem(hint, sortTextPrefix, document));
            });

            return items;
        });
    }

    /**
     * 获取typing模块的类型提示(添加缓存)
     */
    public getTypingHints(document: TextDocument): CompletionItem[] {
        return this.typeCache.getOrCreate('typing', document, () => {
            const items: CompletionItem[] = [];
            const sortTextPrefix = (this.itemSortPrefix + 1).toString();

            Object.values(TypingTypes).forEach((typeName: string) => {
                const type = getTypingType()[typeName];
                const hint =
                    this.settings.appendBrackets && type.category === TypeCategory.Refinable
                        ? `${typeName}[]`
                        : typeName;
                items.push(this.newCompletionItem(hint, sortTextPrefix, document));
            });

            return items;
        });
    }

    /**
     * 清除文档相关的缓存
     */
    public clearCache(document: TextDocument): void {
        this.typeCache.clearDocumentCache(document);
    }

    /**
     * 将类型提示添加到自动完成项数组(优化缓存键生成)
     */
    public pushHintsToItems(
        typeHints: string[],
        completionItems: CompletionItem[],
        firstItemSelected: boolean,
        document: TextDocument
    ) {
        const cacheKey = `hints:${typeHints.join(',')}:${firstItemSelected}`;
        const items = this.typeCache.getOrCreate(cacheKey, document, () => {
            const newItems: CompletionItem[] = [];
            const sortTextPrefix = this.itemSortPrefix.toString();

            if (typeHints.length > 0) {
                newItems.push(
                    firstItemSelected
                        ? this.selectedCompletionItem(typeHints[0], '0b', document)
                        : this.newCompletionItem(typeHints[0], sortTextPrefix, document)
                );

                for (let i = 1; i < typeHints.length; i++) {
                    newItems.push(this.newCompletionItem(typeHints[i], sortTextPrefix, document));
                }
            }

            return newItems;
        });

        completionItems.push(...items);
    }

    /**
     * 处理节点的通用方法
     */
    protected processNode(node: any): void {
        if (!node) return;

        // 根据节点类型进行相应处理
        switch (node.type) {
            case 'Call':
                this.processCallNode(node);
                break;
            case 'Name':
                this.processNameNode(node);
                break;
            // 可以添加其他节点类型的处理
            default:
                break;
        }
    }

    /**
     * 处理调用节点
     */
    protected processCallNode(node: any): void {
        // 基类中的默认实现
    }

    /**
     * 处理名称节点
     */
    protected processNameNode(node: any): void {
        // 基类中的默认实现
    }

    // 修改 processSuperCall 方法
    protected processSuperCall(node: any): void {
        if (!node) return;

        if (node.args) {
            node.args.forEach((arg: any) => {
                this.processNode(arg);
            });
        }
    }
}
