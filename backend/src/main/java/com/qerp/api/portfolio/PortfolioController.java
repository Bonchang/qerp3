package com.qerp.api.portfolio;

import com.qerp.application.portfolio.PortfolioService;
import com.qerp.application.portfolio.PortfolioSummaryView;
import com.qerp.application.portfolio.PositionView;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;

@RestController
@RequestMapping("/api/v1/portfolio")
public class PortfolioController {

    private final PortfolioService portfolioService;

    public PortfolioController(PortfolioService portfolioService) {
        this.portfolioService = portfolioService;
    }

    @GetMapping
    public PortfolioSummaryResponse getPortfolio() {
        PortfolioSummaryView summary = portfolioService.getSummary();
        return new PortfolioSummaryResponse(
                summary.baseCurrency(),
                summary.cashBalance(),
                summary.positionsMarketValue(),
                summary.totalPortfolioValue(),
                summary.unrealizedPnl(),
                summary.realizedPnl(),
                summary.returnRate(),
                summary.asOf()
        );
    }

    @GetMapping("/positions")
    public PortfolioPositionsResponse getPositions() {
        return new PortfolioPositionsResponse(
                portfolioService.getPositions().stream().map(this::toItem).toList(),
                Instant.now()
        );
    }

    private PortfolioPositionsResponse.PositionItem toItem(PositionView position) {
        return new PortfolioPositionsResponse.PositionItem(
                position.symbol(),
                position.quantity(),
                position.avgPrice(),
                position.currentPrice(),
                position.marketValue(),
                position.unrealizedPnl(),
                position.unrealizedPnlRate()
        );
    }
}
