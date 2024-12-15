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

        if (isRefinable && this.settings.appendBrackets) {
            item.insertText = new SnippetString(`${hint}[$1]`);
        }

        return item;
    }

    /**
     * 获取所有自定义类型的提示(使用缓存)
     */
    public getAllCustomTypeHints(document: TextDocument): CompletionItem[] {
        return this.typeCache.getOrCreate(`allCustomTypes:${document.uri.fsPath}`, document, () => {
            // 获取当前文件相关的类型
            const currentFilePath = document.uri.fsPath;
            const items: CompletionItem[] = [];

            // 获取本地类
            for (const [className, info] of this.searchedTypes.getLocalClasses()) {
                if (info.filePath === currentFilePath) {
                    const isRefinable = info.baseClasses.length > 0;
                    const detail = `${CustomTypeProcess.TYPE_SOURCE} (Local${
                        info.baseClasses.length > 0
                            ? `, extends ${info.baseClasses.join(', ')}`
                            : ''
                    })`;
                    items.push(
                        this.createCustomCompletionItem(
                            className,
                            this.itemSortPrefix.toString(),
                            document,
                            detail,
                            isRefinable
                        )
                    );
                }
            }

            // 获取导入的类
            for (const [className, info] of this.searchedTypes.getImportedClasses()) {
                if (info.filePath === currentFilePath) {
                    const detail = `${CustomTypeProcess.TYPE_SOURCE} (Imported from ${info.originalName})`;
                    items.push(
                        this.createCustomCompletionItem(
                            className,
                            (this.itemSortPrefix + 1).toString(),
                            document,
                            detail,
                            true
                        )
                    );
                }
            }

            // 获取类型别名
            for (const [aliasName, info] of this.searchedTypes.getTypeAliases()) {
                if (info.filePath === currentFilePath) {
                    const detail = `${CustomTypeProcess.TYPE_SOURCE} (Alias for ${info.originalType})`;
                    items.push(
                        this.createCustomCompletionItem(
                            aliasName,
                            (this.itemSortPrefix + 2).toString(),
                            document,
                            detail
                        )
                    );
                }
            }

            // 获取类型变量
            for (const [varName, info] of this.searchedTypes.getTypeVars()) {
                if (info.filePath === currentFilePath) {
                    const detail = `${CustomTypeProcess.TYPE_SOURCE} (TypeVar${
                        info.constraints.length > 0
                            ? ` bound to ${info.constraints.join(' & ')}`
                            : ''
                    })`;
                    items.push(
                        this.createCustomCompletionItem(
                            varName,
                            (this.itemSortPrefix + 3).toString(),
                            document,
                            detail,
                            info.constraints.length > 0
                        )
                    );
                }
            }

            // 获取协议类型
            for (const [protocolName, info] of this.searchedTypes.getProtocols()) {
                if (info.filePath === currentFilePath) {
                    const methodCount = Object.keys(info.methods).length;
                    const detail = `${CustomTypeProcess.TYPE_SOURCE} (Protocol with ${methodCount} methods)`;
                    items.push(
                        this.createCustomCompletionItem(
                            protocolName,
                            (this.itemSortPrefix + 4).toString(),
                            document,
                            detail
                        )
                    );
                }
            }

            // 获取字面量类型
            for (const [literalName, info] of this.searchedTypes.getLiteralTypes()) {
                if (info.filePath === currentFilePath) {
                    const detail = `${CustomTypeProcess.TYPE_SOURCE} (Literal: ${info.values.join(' | ')})`;
                    items.push(
                        this.createCustomCompletionItem(
                            literalName,
                            (this.itemSortPrefix + 5).toString(),
                            document,
                            detail
                        )
                    );
                }
            }

            console.log(`Custom types found for ${currentFilePath}:`, items.length);
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
