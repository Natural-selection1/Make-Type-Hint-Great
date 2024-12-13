import * as assert from 'assert';
import { CompletionList, Position, TextDocument } from 'vscode';
import { ParamCompletionProvider } from '../../../src/ParamCompletionProvider';
import { TypeHintSettings } from '../../../src/settings';

suite('ParamCompletionProvider Test Suite', () => {
    let provider: ParamCompletionProvider;

    setup(() => {
        provider = new ParamCompletionProvider(new TypeHintSettings());
    });

    test('should provide completions for function parameters', async () => {
        const doc = {
            lineAt: (line: number) => ({
                text: 'def test(param:'
            }),
            getText: () => 'def test(param:',
            uri: { fsPath: 'test.py' }
        } as any as TextDocument;

        const result = await provider.provideCompletionItems(
            doc,
            new Position(0, 14),
            { isCancellationRequested: false } as any,
            { triggerCharacter: ':' } as any
        );

        assert.ok(result instanceof CompletionList);
        assert.ok(result.items.length > 0);
    });

    test('should not provide completions outside function definition', async () => {
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

        assert.strictEqual(result, null);
    });
});