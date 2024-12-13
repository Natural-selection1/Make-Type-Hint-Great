import * as assert from 'assert';
import { CompletionList, Position, TextDocument } from 'vscode';
import { VariableCompletionProvider } from '../../../src/VariableCompletionProvider';
import { TypeHintSettings } from '../../../src/settings';

suite('VariableCompletionProvider Test Suite', () => {
    let provider: VariableCompletionProvider;

    setup(() => {
        provider = new VariableCompletionProvider(new TypeHintSettings());
    });

    test('should provide completions for variable annotations', async () => {
        const doc = {
            lineAt: (line: number) => ({
                text: 'x:'
            }),
            getText: () => 'x:',
            uri: { fsPath: 'test.py' }
        } as any as TextDocument;

        const result = await provider.provideCompletionItems(
            doc,
            new Position(0, 2),
            { isCancellationRequested: false } as any,
            { triggerCharacter: ':' } as any
        );

        assert.ok(result instanceof CompletionList);
        assert.ok(result.items.length > 0);
    });

    test('should not provide completions for walrus operator', async () => {
        const doc = {
            lineAt: (line: number) => ({
                text: 'x :='
            }),
            getText: () => 'x :=',
            uri: { fsPath: 'test.py' }
        } as any as TextDocument;

        const result = await provider.provideCompletionItems(
            doc,
            new Position(0, 3),
            { isCancellationRequested: false } as any,
            { triggerCharacter: ':' } as any
        );

        assert.strictEqual(result, null);
    });
});