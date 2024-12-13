import {
    TextDocument,
    Position,
    CancellationToken,
    CompletionContext,
    CompletionList,
    CompletionItem,
} from 'vscode';
import { BaseCompletionProvider } from './BaseCompletionProvider';
import { variableHintTrigger } from './BaseTypes';

/**
 * Python变量类型提示的自动完成提供程序
 * 继承自BaseCompletionProvider基类
 *
 * 功能:
 * - 检测变量类型提示的触发条件
 * - 提供变量类型的自动完成建议
 * - 支持在输入变量名后的冒号(:)时触发提示
 */
export class VariableCompletionProvider extends BaseCompletionProvider {
    /**
     * 判断是否应该提供变量类型提示
     * @param precedingText 光标前的文本
     * @returns 是否应该提供类型提示
     *
     * 检查条件:
     * 1. 文本以字母或下划线开头,后跟字母数字下划线
     * 2. 文本以冒号结尾
     * 3. 不是海象运算符(:=)
     */
    private shouldProvideVariableHint(precedingText: string): boolean {
        return (
            // 检查是否匹配变量定义模式: 变量名后跟冒号
            /^[a-zA-Z_][a-zA-Z0-9_]*\s*:\s*$/.test(precedingText) &&
            // 排除海象运算符(:=)的情况
            !/:=\s*$/.test(precedingText)
        );
    }

    /**
     * 提供自动完成项的主要方法
     * @param doc 当前文档
     * @param pos 光标位置
     * @param token 取消令牌
     * @param context 自动完成上下文
     * @returns CompletionList对象或null
     *
     * 处理流程:
     * 1. 检查触发字符是否正确(是否为:)
     * 2. 判断是否应该提供类型提示
     * 3. 提取变量名并生成类型提示
     */
    public async provideCompletionItems(
        doc: TextDocument,
        pos: Position,
        token: CancellationToken,
        context: CompletionContext
    ): Promise<CompletionList | null> {
        // 检查触发字符是否为冒号
        if (context.triggerCharacter !== variableHintTrigger) {
            return null;
        }

        // 初始化自动完成项数组
        const items: CompletionItem[] = [];

        // 获取当前行和光标前的文本
        const line = doc.lineAt(pos);
        const precedingText = line.text.substring(0, pos.character).trim();

        // 判断是否应该提供类型提示
        if (this.shouldProvideVariableHint(precedingText)) {
            // 提取变量名
            const varNameMatch = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*$/.exec(precedingText);

            // 如果成功提取变量名且未取消,生成类型提示
            if (varNameMatch && !token.isCancellationRequested) {
                await this.processTypeHints(varNameMatch[1], doc.getText(), items, token, doc);
                return new CompletionList(items, false);
            }
        }
        return null;
    }
}
