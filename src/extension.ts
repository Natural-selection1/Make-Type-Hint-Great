import * as vscode from 'vscode';
import { ParamCompletionProvider } from './ParamCompletionProvider';
import { ReturnValueCompletionProvider } from './ReturnValueCompletionProvider';
import { VariableCompletionProvider } from './VariableCompletionProvider';
import { paramHintTrigger, returnHintTrigger, variableHintTrigger } from './BaseTypes';
import { TypeHintSettings } from './settings';

/**
 * 当插件被激活时调用此函数
 * 注册三种类型提示的自动完成提供程序:
 * 1. 参数类型提示 (:)
 * 2. 返回值类型提示 (>)
 * 3. 变量类型提示 (:)
 * @param context 插件上下文
 */
export function activate(context: vscode.ExtensionContext) {
    // 创建设置实例，用于管理插件配置
    const settings = new TypeHintSettings();

    // 注册自动完成提供程序
    // context.subscriptions用于管理插件的资源释放
    context.subscriptions.push(
        // 注册funcparam提示的自动完成提供程序
        // 'python' - 只在Python文件中生效
        // paramHintTrigger - 触发自动完成的字符(这里是':')
        vscode.languages.registerCompletionItemProvider(
            'python',
            new ParamCompletionProvider(settings),
            paramHintTrigger
        ),
        // 注册returnValue提示的自动完成提供程序
        // returnHintTrigger - 触发自动完成的字符(这里是'>')
        vscode.languages.registerCompletionItemProvider(
            'python',
            new ReturnValueCompletionProvider(settings),
            returnHintTrigger
        ),
        // 注册variable提示的自动完成提供程序
        vscode.languages.registerCompletionItemProvider(
            'python',
            new VariableCompletionProvider(settings),
            variableHintTrigger // 使用变量类型提示的触发字符
        )
    );
}

/**
 * 当插件被停用时调用此函数
 * 用于清理资源(目前无需清理)
 */
export function deactivate() {}
