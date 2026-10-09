// node --import ./tests/support/register.mjs --test tests/<file>.test.mjs
import { register } from 'node:module';

register('./alias-hooks.mjs', import.meta.url);
