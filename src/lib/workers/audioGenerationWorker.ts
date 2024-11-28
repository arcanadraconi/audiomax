import * as Comlink from 'comlink';
import { playhtClient } from '../playht';

// Expose the PlayHT client's generateSpeech method to the main thread
Comlink.expose(playhtClient.generateSpeech.bind(playhtClient));
