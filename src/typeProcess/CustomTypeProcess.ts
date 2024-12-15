import { CompletionItem, CompletionItemKind, TextDocument, SnippetString } from 'vscode';
import { BaseTypeProcess } from './BaseTypeProcess';
import { TypeHintSettings } from '../settings';
import CustomTypes from '../typeData/CustomTypes';
import { TypeCategory } from '../typeData/BaseTypes';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 自定义类型处理中间件
 * 处理所有从Python文件中收集到的自定义类型
 */
export class CustomTypeProcess extends BaseTypeProcess {
    private searchedTypes: CustomTypes;
    private static TYPE_SOURCE = '[custom]';
    private static DEBUG_FILE = 'E:\\0000__Python_Project\\00__Make_Type_Hint_Great\\DeBug.txt';

    constructor(settings: TypeHintSettings, itemSortPrefix: number = 80) {
        super(settings, itemSortPrefix);
        this.searchedTypes = CustomTypes.getInstance();
    }

    /**
     * 写入调试信息到文件
     */
    private writeDebugInfo(content: string) {
        try {
            fs.writeFileSync(CustomTypeProcess.DEBUG_FILE, content);
        } catch (error) {
            console.error('写入调试文件失败:', error);
        }
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
            const currentFilePath = document.uri.fsPath;
            const items: CompletionItem[] = [];

            // #region TYPE_STATISTICS_USAGE
            // 获取并记录当前文件的类型统计信息
            let debugOutput = `Type Statistics for ${currentFilePath}:\n`;
            const typeStats = this.searchedTypes.getTypeStats();

            // 按类别组织当前文件的统计信息
            const categorizedStats = new Map<string, { count: number; types: string[] }>();

            // 只统计当前文件中的类型
            const currentFileTypes = this.searchedTypes.getFileTypes(currentFilePath);
            currentFileTypes.forEach(({ name }) => {
                const stats = typeStats.get(name);
                if (stats) {
                    const category = stats.category;
                    const categoryStats = categorizedStats.get(category) || { count: 0, types: [] };
                    categoryStats.count += stats.count;
                    categoryStats.types.push(`${name}(${stats.count})`);
                    categorizedStats.set(category, categoryStats);
                }
            });

            // 格式化统计信息
            if (categorizedStats.size > 0) {
                categorizedStats.forEach((stats, category) => {
                    debugOutput += `\n${category} (Total: ${stats.count}):\n`;
                    debugOutput += stats.types.join(', ') + '\n';
                });
            } else {
                debugOutput += '\nNo types found in this file.\n';
            }

            // 覆盖式写入调试信息
            this.writeDebugInfo(debugOutput);
            console.log(debugOutput);
            // #endregion TYPE_STATISTICS_USAGE

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
}
