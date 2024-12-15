import { workspace, EventEmitter, Event } from 'vscode';

/**
 * 用户设置管理类
 * 负责管理和监听VS Code的配置变更
 */
export class TypeHintSettings {
    private _appendBrackets = true; // 是否在类型提示中添加中括号
    private _enableCustomTypes = true; // 是否启用自定义类型提示
    private _enableBaseTypes = true; // 是否启用内置和typing类型提示

    constructor() {
        // 监听配置变更事件
        workspace.onDidChangeConfiguration(() => {
            this.initialize();
            this.settingsUpdated.fire();
        });
        this.initialize();
    }

    // Getter方法
    public get appendBrackets() {
        return this._appendBrackets;
    }

    public get enableCustomTypes() {
        return this._enableCustomTypes;
    }

    public get enableBaseTypes() {
        return this._enableBaseTypes;
    }

    /**
     * 设置更新事件发射器
     * 当配置发生变化时触发
     */
    public readonly settingsUpdated = new EventEmitter<void>();

    /**
     * 设置变更事件
     * 用于通知订阅者配置已更新
     */
    public get onDidChangeConfiguration(): Event<void> {
        return this.settingsUpdated.event;
    }

    /**
     * 初始化设置
     * 从VS Code配置中读取设置值
     */
    private initialize() {
        const config = workspace.getConfiguration('python.typeHint');
        const appendBrackets = config.get<boolean>('appendBrackets');

        if (appendBrackets !== undefined) {
            this._appendBrackets = appendBrackets;
        }

        const enableCustomTypes = config.get<boolean>('enableCustomTypes');
        if (enableCustomTypes !== undefined) {
            this._enableCustomTypes = enableCustomTypes;
        }

        const enableBaseTypes = config.get<boolean>('enableBaseTypes');
        if (enableBaseTypes !== undefined) {
            this._enableBaseTypes = enableBaseTypes;
        }
    }
}
