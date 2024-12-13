import * as assert from 'assert';
import { CompletionList, Position, TextDocument } from 'vscode';
import { ReturnValueCompletionProvider } from '../../../src/ReturnValueCompletionProvider';
import { TypeHintSettings } from '../../../src/settings';

suite('ReturnValueCompletionProvider Test Suite', () => {
    let provider: ReturnValueCompletionProvider;

    setup(() => {
        provider = new ReturnValueCompletionProvider(new TypeHintSettings());
    });

    test('should provide completions for return type hints', async () => {
        const doc = {
            lineAt: (line: number) => ({
                text: 'def test() ->'
            }),
            getText: () => 'def test() ->',
            uri: { fsPath: 'test.py' }
        } as any as TextDocument;

        const result = await provider.provideCompletionItems(
            doc,
            new Position(0, 13),
            { isCancellationRequested: false } as any,
            { triggerCharacter: '>' } as any
        );

        assert.ok(result instanceof CompletionList);
        assert.ok(result.items.length > 0);
    });

    test('should not provide completions for arrow outside function definition', async () => {
        const doc = {
            lineAt: (line: number) => ({
                text: 'x ->'
            }),
            getText: () => 'x ->',
            uri: { fsPath: 'test.py' }
        } as any as TextDocument;

        const result = await provider.provideCompletionItems(
            doc,
            new Position(0, 4),
            { isCancellationRequested: false } as any,
            { triggerCharacter: '>' } as any
        );

        assert.strictEqual(result, null);
    });
});