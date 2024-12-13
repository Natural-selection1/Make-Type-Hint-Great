import {
    TextDocument,
    Position,
    CancellationToken,
    CompletionContext,
    CompletionList,
    Range,
    CompletionItem,
} from 'vscode';
import { BaseCompletionProvider } from '../BaseCompletionProvider';
import { paramHintTrigger } from '../typeData/BaseTypes';

/**
 * 函数参数提示的自动完成提供程序
 * 继承自BaseCompletionProvider基类
 *
 * 主要功能:
 * - 检测函数参数类型提示的触发条件
 * - 从参数名称中提取有效的参数
 * - 提供参数类型的自动完成建议
 */
export class ParamCompletionProvider extends BaseCompletionProvider {
    /**
     * 从文本中提取有效的参数名
     *
     * @param precedingText 光标前的文本
     * @param doc 当前文档
     * @returns 提取的参数名,如果无效则返回null
     *
     * 处理流程:
     * 1. 按照逗号、括号等分隔符分割文本
     * 2. 获取最后一个分段作为参数名
     * 3. 验证参数名的有效性(不包含特殊字符)
     */
    private getParam(precedingText: string, doc: TextDocument): string | null {
        try {
            // 首先尝试使用 AST
            const position = doc.positionAt(precedingText.length);
            const analysis = this.typeAnalyzer.analyzeFunctionParameters({
                line: position.line,
                character: position.character
            });

            if (analysis?.paramName) {
                return analysis.paramName;
            }
        } catch (error) {
            console.error('Error in AST analysis:', error);
        }

        // 后备方案：使用原来的正则表达式逻辑
        const split = precedingText.split(/[,(*]/);
        let param = split.length > 1 ? split[split.length - 1].trim() : precedingText;
        return !param || /[!:\]\[?/\\{}.+/=)'";@&£%¤|<>$^~¨ -]/.test(param) ? null : param;
    }

    /**
     * 判断是否应该提供自动完成项
     *
     * @param precedingText 光标前的文本
     * @param activePos 当前光标位置
     * @param doc 当前文档
     * @returns 是否应该提供自动完成
     *
     * 检查条件:
     * 1. 光标位置大于0且不在注释中
     * 2. 当前行是函数定义
     * 3. 如果当前行不是函数定义,则检查前4行是否包含未完成的函数定义
     */
    private shouldProvideItems(
        precedingText: string,
        activePos: Position,
        doc: TextDocument
    ): boolean {
        // 检查光标位置是否大于0且不在注释中
        if (activePos.character > 0 && !/#/.test(precedingText)) {
            // 检查当前行是否是函数定义
            let provide = /^[ \t]*(def |async *def )/.test(precedingText);

            // 如果当前行不是函数定义,检查前几行
            if (!provide) {
                // 确定要检查的行数(最多4行)
                const nLinesToCheck = activePos.line > 4 ? 4 : activePos.line;

                // 获取前几行的文本
                const previousLines = doc.getText(
                    new Range(doc.lineAt(activePos.line - nLinesToCheck).range.start, activePos)
                );

                // 检查是否包含未完成的函数定义
                // (?![\\s\\S]+(\\):|-> *[^:\\s]+:)) 确保函数定义未结束
                provide = new RegExp(
                    `^[ \t]*(async *)?def(?![\\s\\S]+(\\):|-> *[^:\\s]+:))`,
                    'm'
                ).test(previousLines);
            }
            return provide;
        }
        return false;
    }

    /**
     * 提供自动完成项的主要方法
     *
     * @param doc 当前文档
     * @param pos 光标位置
     * @param token 取消令牌
     * @param context 自动完成上下文
     * @returns CompletionList对象或null
     *
     * 处理流程:
     * 1. 检查触发字符是否正确(是否为:)
     * 2. 判断是否应该提供自动完成
     * 3. 提取有效的参数名
     * 4. 根据参数名生成类型提示
     */
    public async provideCompletionItems(
        doc: TextDocument,
        pos: Position,
        token: CancellationToken,
        context: CompletionContext
    ): Promise<CompletionList | null> {
        // 检查触发字符是否为冒号
        if (context.triggerCharacter !== paramHintTrigger) {
            return null;
        }

        // 初始化自动完成项数组
        const items: CompletionItem[] = [];

        // 获取当前行和光标前的文本
        const line = doc.lineAt(pos);
        const precedingText = line.text.substring(0, pos.character - 1).trim();

        // 判断是否应该提供自动完成并处理
        if (this.shouldProvideItems(precedingText, pos, doc)) {
            // 提取参数名 - 传入doc参数
            const param = this.getParam(precedingText, doc);

            // 如果有有效参数名且未取消,生成类型提示
            if (param && !token.isCancellationRequested) {
                await this.processTypeHints(param, doc.getText(), items, token, doc);
                return new CompletionList(items, false);
            }
        }
        return null;
    }
}
