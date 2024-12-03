declare module 'natural' {
    export class TfIdf {
        constructor();
        addDocument(doc: string): void;
        listTerms(index: number): Array<{term: string; tfidf: number}>;
    }

    export class SentenceTokenizer {
        constructor();
        tokenize(text: string): string[];
    }
}
