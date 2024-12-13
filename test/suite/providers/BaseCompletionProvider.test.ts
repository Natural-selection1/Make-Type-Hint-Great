import * as assert from 'assert';
import { CompletionItem } from 'vscode';
import { BaseCompletionProvider } from '../../../src/BaseCompletionProvider';
import { TypeHintSettings } from '../../../src/settings';
import { BaseTypeProcess } from '../../../src/BaseTypeProcess';

// 创建一个具体类用于测试抽象基类
class TestCompletionProvider extends BaseCompletionProvider {
    public get testTypeProcess() {
        return this.typeProcess;
    }

    constructor() {
        super(new TypeHintSettings());
    }

    async provideCompletionItems() {
        return null;
    }
}

suite('BaseCompletionProvider Test Suite', () => {
    let provider: TestCompletionProvider;

    setup(() => {
        provider = new TestCompletionProvider();
    });

    test('should create completion item with correct label and sort text', () => {
        const item = provider.testTypeProcess.selectedCompletionItem('str', '1', {} as any);
        assert.strictEqual(item.label, ' str');
        assert.strictEqual(item.sortText, '1str');
    });

    test('should detect typing module types', () => {
        const item = provider.testTypeProcess.selectedCompletionItem('List', '1', {} as any);
        assert.strictEqual(item.detail, '[typing]');
    });

    test('should detect builtin types', () => {
        const item = provider.testTypeProcess.selectedCompletionItem('str', '1', {} as any);
        assert.strictEqual(item.detail, '[builtin]');
    });
});