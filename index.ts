import { Application, Router, isHttpError, Status } from "https://deno.land/x/oak/mod.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";
import { v4 } from "https://deno.land/std/uuid/mod.ts";
import * as yup from 'https://cdn.pika.dev/yup@^0.28.1';
const env = config();

// await init();

// const client = new MongoClient();
// client.connectWithUri(env.MONGO_URI);

// const db = client.database("test");
// const users = db.collection("users");

const dinosaurSchema = yup.object().shape({
    name: yup.string().trim().min(2).required(),
    image: yup.string().trim().url().required()
})

interface RequestError extends Error {
    status: number
}

interface Dinosaur {
    id?: string;
    name: string;
    image: string;
};

const DB = new Map<string, Dinosaur>();

const router = new Router();

router.get('/dinosaurs', (ctx) => {
    ctx.response.body = [...DB.values()];
});
router.post('/dinosaurs', async (ctx) => {
    try {
        const body = await ctx.request.body();
        if(body.type !== 'json') throw new Error('invalid body');
        console.log('Body ', body);
        const dinosaur = (await dinosaurSchema.validate(body.value) as Dinosaur);
        dinosaur.id = v4.generate();
        DB.set(dinosaur.id, dinosaur);
        ctx.response.body = dinosaur;
    } catch (e) {
        console.log('failed');
        const error = new Error('Not Found') as RequestError;
        error.status = 404;
        throw error;
    }
});

router.delete('/dinosaurs/:id', (ctx) => {
    const { id } = ctx.params;
    if(id && DB.has(id)){
        ctx.response.status = 204;
        ctx.response.body = ''
        // ctx.response.body = DB.get(id);
        DB.delete(id);
    } else {
        const error = new Error('Not Found') as RequestError;
        error.status = 404;
        throw error;
    }
});

// router.get('/', (ctx) => {
//     ctx.response.body = {
//         message: "Api running successfully"
//     };
// })

const app = new Application();

app.use(router.routes());
app.use(router.allowedMethods());

// Logger
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
});

// Timing
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

// Hello World!
// app.use((ctx) => {
//   ctx.response.body = {
//     "message": "This is the World!",
//   };
// });

app.use(async (ctx, next) => {
    try {
        await next();
      } catch (err) {
       const error = err as RequestError;
       ctx.response.status = error.status || 500
       ctx.response.body = {
           message: error.message
       };
      }
});

// console.log(Deno.env.get("PORT"));
// const portStr = Deno.env.get('8000');
const port = parseInt(env.PORT);
console.log(`Running on ${port}`);
// const port = 8000;
await app.listen({ port: port });
