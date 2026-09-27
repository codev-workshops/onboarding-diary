---
name: backend-coroutine-conventions
description: Coroutine dispatcher and streaming conventions for the Kotlin/WebFlux backend (Dispatchers.IO default, virtual-thread opt-in, WebClient direct call, Flow-based SSE).
---

# Backend coroutine conventions

Handlers are `suspend` functions. Pick the pattern by the kind of call:

| Call type                         | Pattern                                        |
|-----------------------------------|------------------------------------------------|
| Blocking (JDBC, blocking SDK)     | `withContext(Dispatchers.IO) { ... }`          |
| High-concurrency blocking         | `withContext(VirtualThreads) { ... }` (opt-in) |
| Non-blocking HTTP (`WebClient`)   | call directly, `.awaitBody()`                  |
| Server-sent events / streaming    | return `Flow<T>`                               |

## Blocking call (default)

```kotlin
suspend fun findEntry(id: Long): DiaryEntry? = withContext(Dispatchers.IO) {
    jdbcRepository.findById(id)
}
```

## Virtual-thread dispatcher (opt-in)

```kotlin
val VirtualThreads: CoroutineDispatcher =
    Executors.newVirtualThreadPerTaskExecutor().asCoroutineDispatcher()

suspend fun bulkImport(rows: List<Row>) = withContext(VirtualThreads) {
    rows.forEach { jdbcRepository.insert(it) }
}
```

JDK 24 (JEP 491) removes `synchronized` pinning, so JDBC drivers/pools are safe
on virtual threads.

## WebClient — no dispatcher wrapping

```kotlin
suspend fun fetchProfile(id: String): Profile =
    webClient.get().uri("/users/{id}", id).retrieve().awaitBody()
```

## SSE via Flow

```kotlin
@GetMapping("/events", produces = [MediaType.TEXT_EVENT_STREAM_VALUE])
fun events(): Flow<DiaryEvent> = eventService.stream()
```

Do not use `Flow` for single blocking calls; use it only for real streams.
