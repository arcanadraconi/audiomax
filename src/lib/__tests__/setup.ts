import '@jest/globals';

// Mock environment variables
process.env.VITE_OPENROUTER_API_KEY = 'test-api-key';
process.env.VITE_MONGODB_URI = 'mongodb://localhost:27017/test';

// Sample response content (about 2250 words for 15 minutes)
const sampleContent = `
Let me share with you a fascinating perspective on the power of mental control! 
Have you ever noticed how our thoughts shape every aspect of our lives? From the moment we wake up 
to the time we rest our heads at night, our mental state influences everything we do.

Think about the last time you faced a challenging situation. Your mindset in that moment likely 
determined how you handled it. This isn't just personal observation – it's backed by decades of 
research in cognitive science and psychology!

I want to walk you through three transformative techniques that you can start using today. 
The first is what I call the "pause and reflect" method. When you feel overwhelmed, take a 
deliberate three-second pause. During this brief moment, simply observe your thoughts without 
judgment.

The second technique builds on this foundation. It's about reframing your internal dialogue. 
Instead of saying "I have to," try saying "I choose to." This subtle shift in language can 
dramatically change how you approach tasks and challenges!

Let's explore the third technique, which I find particularly powerful. It's called "future 
self-visualization." Take a moment to imagine yourself having already achieved your goal. 
What does that version of you think, feel, and do differently?

These aren't just theoretical concepts. I've seen countless individuals transform their lives 
by applying these principles. Take Sarah, a client of mine, who used these techniques to 
overcome severe presentation anxiety and eventually become a keynote speaker!

But let's dive deeper into how these techniques work in practice. When you first start implementing 
the pause and reflect method, you might find it challenging. That's completely normal! Your mind 
has been running on autopilot for years, maybe decades.

Think of it like training a muscle. You wouldn't expect to lift heavy weights on your first day 
at the gym, would you? The same principle applies to mental control. Start small, be consistent, 
and watch your mental strength grow day by day.

Let me share a personal story that illustrates this perfectly. Five years ago, I found myself 
overwhelmed with work, family obligations, and personal goals. My mind was constantly racing, 
jumping from one worry to the next. Sound familiar?

That's when I discovered these techniques. The transformation wasn't overnight, but it was profound. 
Within weeks, I noticed a significant change in how I handled stress. Within months, my colleagues 
were asking what had changed – they could see the difference in my presence and decision-making!

Now, you might be wondering: "How can I maintain these practices when life gets hectic?" It's a 
great question, and one I hear often. The key is integration rather than addition. Don't think 
of these techniques as another item on your to-do list.

Instead, weave them into your existing routines. Practice the pause and reflect method while 
waiting for your morning coffee. Use reframing during your commute. Visualize your future self 
while exercising. The possibilities are endless!

Remember, the goal isn't perfection – it's progress. Every time you catch yourself spiraling 
into negative thoughts and choose to pause, that's a win. Every time you reframe a "have to" 
into a "choose to," you're rewiring your brain for success!

Let's talk about the science behind these techniques. Research in neuroplasticity shows that 
our brains continue to form new neural pathways throughout our lives. This means that with 
consistent practice, we can literally reshape our thought patterns!

Studies have shown that regular mindfulness practice – like our pause and reflect technique – 
can reduce stress, improve focus, and enhance decision-making capabilities. The evidence is 
clear: these aren't just feel-good exercises; they're powerful tools for mental transformation!

As we wrap up, I want to leave you with a challenge. Choose one of these techniques – whichever 
resonates with you most – and commit to practicing it for the next seven days. Just seven days. 
Can you do that? I know you can!

Start small, but start today. Your future self will thank you for taking this step. Remember, 
every journey begins with a single step, and you've already taken that step by being here, 
learning these techniques.

The power to change your mental state, and therefore your life, is in your hands. Use these 
tools wisely, practice them consistently, and watch as your world transforms in ways you 
never thought possible!`.repeat(3);

// Create Response class mock
class MockResponse implements Response {
  readonly headers: Headers;
  readonly ok: boolean;
  readonly redirected: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly type: ResponseType;
  readonly url: string;
  readonly body: ReadableStream<Uint8Array> | null;
  readonly bodyUsed: boolean;

  constructor() {
    this.headers = new Headers({ 'Content-Type': 'application/json' });
    this.ok = true;
    this.redirected = false;
    this.status = 200;
    this.statusText = 'OK';
    this.type = 'basic';
    this.url = 'https://api.openrouter.ai/api/v1/chat/completions';
    this.body = null;
    this.bodyUsed = false;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    throw new Error('Not implemented');
  }

  async blob(): Promise<Blob> {
    throw new Error('Not implemented');
  }

  async formData(): Promise<FormData> {
    throw new Error('Not implemented');
  }

  async json(): Promise<any> {
    return {
      choices: [
        {
          message: {
            content: sampleContent,
            role: 'assistant'
          },
          finish_reason: 'stop'
        }
      ]
    };
  }

  async text(): Promise<string> {
    const json = await this.json();
    return JSON.stringify(json);
  }

  async bytes(): Promise<Uint8Array> {
    const text = await this.text();
    return new TextEncoder().encode(text);
  }

  clone(): Response {
    return new MockResponse();
  }
}

// Mock fetch implementation
const mockFetch = jest.fn().mockImplementation(() => Promise.resolve(new MockResponse()));

// Add fetch to global object
global.fetch = mockFetch;

export {};
