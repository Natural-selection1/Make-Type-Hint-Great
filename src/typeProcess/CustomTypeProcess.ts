import { CompletionItem, CompletionItemKind, TextDocument, SnippetString } from 'vscode';
import { BaseTypeProcess } from './BaseTypeProcess';
import { TypeHintSettings } from '../settings';
import CustomTypes from '../typeData/CustomTypes';
import { TypeCategory } from '../typeData/BaseTypes';

/**
 * 自定义类型处理中间件
 * 处理所有从Python文件中收集到的自定义类型
 */
export class CustomTypeProcess extends BaseTypeProcess {
    private searchedTypes: CustomTypes;
    private static TYPE_SOURCE = '[custom]';

    constructor(settings: TypeHintSettings, itemSortPrefix: number = 80) {
        super(settings, itemSortPrefix);
        this.searchedTypes = CustomTypes.getInstance();
    }

    /**
     * 创建自定义类型的补全项
     */
    protected createCustomCompletionItem(
        hint: string,
        sortTextPrefix: string,
        document: TextDocument,
        detail?: string,
        isRefinable: boolean = false
    ): CompletionItem {
        const item = new CompletionItem(hint.trim(), CompletionItemKind.TypeParameter);
        item.sortText = `${sortTextPrefix}${hint}`;
        item.detail = detail || CustomTypeProcess.TYPE_SOURCE;

        // 如果类型可细化且设置了appendBrackets，添加类型参数占位符
        if (isRefinable && this.settings.appendBrackets) {
            item.insertText = new SnippetString(`${hint}[$1]`);
        }

        return item;
    }

    /**
     * 获取本地定义的类的提示(添加缓存)
     */
    public getLocalClassHints(document: TextDocument): CompletionItem[] {
        return this.typeCache.getOrCreate('localClasses', document, () => {
            const items: CompletionItem[] = [];
            const sortTextPrefix = this.itemSortPrefix.toString();

            for (const [className, info] of this.searchedTypes.getLocalClasses()) {
                const isRefinable = info.baseClasses.length > 0;
                const detail = `${CustomTypeProcess.TYPE_SOURCE} (Local${
                    info.baseClasses.length > 0 ? `, extends ${info.baseClasses.join(', ')}` : ''
                })`;

                items.push(
                    this.createCustomCompletionItem(
                        className,
                        sortTextPrefix,
                        document,
                        detail,
                        isRefinable
                    )
                );
            }

            return items;
        });
    }

    /**
     * 获取导入的类的提示(添加缓存)
     */
    public getImportedClassHints(document: TextDocument): CompletionItem[] {
        return this.typeCache.getOrCreate('importedClasses', document, () => {
            const items: CompletionItem[] = [];
            const sortTextPrefix = (this.itemSortPrefix + 1).toString();

            for (const [className, info] of this.searchedTypes.getImportedClasses()) {
                const detail = `${CustomTypeProcess.TYPE_SOURCE} (Imported from ${info.originalName})`;
                items.push(
                    this.createCustomCompletionItem(
                        className,
                        sortTextPrefix,
                        document,
                        detail,
                        true // 导入的类默认可细化
                    )
                );
            }

            return items;
        });
    }

    /**
     * 获取类型别名的提示(添加缓存)
     */
    public getTypeAliasHints(document: TextDocument): CompletionItem[] {
        return this.typeCache.getOrCreate('typeAliases', document, () => {
            const items: CompletionItem[] = [];
            const sortTextPrefix = (this.itemSortPrefix + 2).toString();

            for (const [aliasName, info] of this.searchedTypes.getTypeAliases()) {
                const detail = `${CustomTypeProcess.TYPE_SOURCE} (Alias for ${info.originalType})`;
                items.push(
                    this.createCustomCompletionItem(aliasName, sortTextPrefix, document, detail)
                );
            }

            return items;
        });
    }

    /**
     * 获取类型变量的提示(添加缓存)
     */
    public getTypeVarHints(document: TextDocument): CompletionItem[] {
        return this.typeCache.getOrCreate('typeVars', document, () => {
            const items: CompletionItem[] = [];
            const sortTextPrefix = (this.itemSortPrefix + 3).toString();

            for (const [varName, info] of this.searchedTypes.getTypeVars()) {
                const detail = `${CustomTypeProcess.TYPE_SOURCE} (TypeVar${
                    info.constraints.length > 0 ? ` bound to ${info.constraints.join(' & ')}` : ''
                })`;

                items.push(
                    this.createCustomCompletionItem(
                        varName,
                        sortTextPrefix,
                        document,
                        detail,
                        info.constraints.length > 0
                    )
                );
            }

            return items;
        });
    }

    /**
     * 获取协议类型的提示(添加缓存)
     */
    public getProtocolHints(document: TextDocument): CompletionItem[] {
        return this.typeCache.getOrCreate('protocols', document, () => {
            const items: CompletionItem[] = [];
            const sortTextPrefix = (this.itemSortPrefix + 4).toString();

            for (const [protocolName, info] of this.searchedTypes.getProtocols()) {
                const methodCount = Object.keys(info.methods).length;
                const detail = `${CustomTypeProcess.TYPE_SOURCE} (Protocol with ${methodCount} methods)`;

                items.push(
                    this.createCustomCompletionItem(protocolName, sortTextPrefix, document, detail)
                );
            }

            return items;
        });
    }

    /**
     * 获取字面量类型的提示(添加缓存)
     */
    public getLiteralTypeHints(document: TextDocument): CompletionItem[] {
        return this.typeCache.getOrCreate('literalTypes', document, () => {
            const items: CompletionItem[] = [];
            const sortTextPrefix = (this.itemSortPrefix + 5).toString();

            for (const [literalName, info] of this.searchedTypes.getLiteralTypes()) {
                const detail = `${CustomTypeProcess.TYPE_SOURCE} (Literal: ${info.values.join(' | ')})`;
                items.push(
                    this.createCustomCompletionItem(literalName, sortTextPrefix, document, detail)
                );
            }

            return items;
        });
    }

    /**
     * 获取所有自定义类型的提示(使用缓存)
     */
    public getAllCustomTypeHints(document: TextDocument): CompletionItem[] {
        return this.typeCache.getOrCreate('allCustomTypes', document, () => {
            const localClasses = this.searchedTypes.getLocalClasses();
            console.log('Local classes found:', localClasses.size);

            const items = [
                ...this.getLocalClassHints(document),
                ...this.getImportedClassHints(document),
                ...this.getTypeAliasHints(document),
                ...this.getTypeVarHints(document),
                ...this.getProtocolHints(document),
                ...this.getLiteralTypeHints(document),
            ];

            console.log('Total custom type hints:', items.length);
            return items;
        });
    }

    /**
     * 获取指定文件中定义的所有类型的提示(使用缓存)
     */
    public getFileTypeHints(filePath: string, document: TextDocument): CompletionItem[] {
        return this.typeCache.getOrCreate(`file:${filePath}`, document, () => {
            const items: CompletionItem[] = [];
            const sortTextPrefix = this.itemSortPrefix.toString();
            const fileTypes = this.searchedTypes.getFileTypes(filePath);

            for (const type of fileTypes) {
                items.push(
                    this.createCustomCompletionItem(
                        type.name,
                        sortTextPrefix,
                        document,
                        `${CustomTypeProcess.TYPE_SOURCE} (Defined in current file)`,
                        type.isRefinable
                    )
                );
            }

            return items;
        });
    }
}
