package com.qerp.application.portfolio;

import com.qerp.application.market.MarketDataService;
import com.qerp.application.order.InMemoryOrderStore;
import com.qerp.domain.portfolio.Portfolio;
import com.qerp.domain.portfolio.PortfolioMetrics;
import com.qerp.domain.portfolio.Position;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class PortfolioService {

    private final InMemoryOrderStore orderStore;
    private final MarketDataService marketDataService;

    public PortfolioService(InMemoryOrderStore orderStore, MarketDataService marketDataService) {
        this.orderStore = orderStore;
        this.marketDataService = marketDataService;
    }

    public Portfolio currentPortfolio() {
        return orderStore.getPortfolio();
    }

    public PortfolioSummaryView getSummary() {
        PortfolioMetrics metrics = currentPortfolio().calculateMetrics(marketDataService.getAllReferencePrices());
        return new PortfolioSummaryView(
                "USD",
                metrics.cashBalance(),
                metrics.positionsMarketValue(),
                metrics.totalPortfolioValue(),
                metrics.unrealizedPnl(),
                metrics.realizedPnl(),
                metrics.returnRate(),
                Instant.now()
        );
    }

    public List<PositionView> getPositions() {
        Map<String, BigDecimal> referencePrices = marketDataService.getAllReferencePrices();
        return currentPortfolio().positions().values().stream()
                .sorted(Comparator.comparing(Position::symbol))
                .map(position -> toView(position, referencePrices.get(position.symbol())))
                .toList();
    }

    public void updatePortfolio(Portfolio portfolio) {
        orderStore.updatePortfolio(portfolio);
    }

    private PositionView toView(Position position, BigDecimal currentPrice) {
        BigDecimal normalizedCurrentPrice = currentPrice == null ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP) : currentPrice.setScale(2, RoundingMode.HALF_UP);
        BigDecimal marketValue = position.quantity().multiply(normalizedCurrentPrice).setScale(2, RoundingMode.HALF_UP);
        BigDecimal unrealizedPnl = normalizedCurrentPrice.subtract(position.averagePrice())
                .multiply(position.quantity())
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal unrealizedPnlRate = position.averagePrice().compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP)
                : normalizedCurrentPrice.subtract(position.averagePrice())
                .divide(position.averagePrice(), 4, RoundingMode.HALF_UP);
        return new PositionView(
                position.symbol(),
                position.quantity(),
                position.averagePrice(),
                normalizedCurrentPrice,
                marketValue,
                unrealizedPnl,
                unrealizedPnlRate
        );
    }
}
