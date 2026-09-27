package com.onboardingdiary.config

import org.slf4j.LoggerFactory
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.stereotype.Component
import org.springframework.web.server.ServerWebExchange
import org.springframework.web.server.WebFilter
import org.springframework.web.server.WebFilterChain
import reactor.core.publisher.Mono

/**
 * One line per request: method, path, status, duration. Deliberately logs no
 * headers, query strings or bodies so credentials and tokens never reach the
 * log.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
class RequestLoggingFilter : WebFilter {

    private val log = LoggerFactory.getLogger("http.request")

    override fun filter(exchange: ServerWebExchange, chain: WebFilterChain): Mono<Void> {
        val start = System.nanoTime()
        return chain.filter(exchange).doFinally {
            val ms = (System.nanoTime() - start) / 1_000_000
            log.info(
                "{} {} -> {} ({} ms)",
                exchange.request.method,
                exchange.request.path.value(),
                exchange.response.statusCode?.value() ?: "-",
                ms,
            )
        }
    }
}
