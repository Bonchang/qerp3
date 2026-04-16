package com.qerp.application.portfolio;

import com.qerp.domain.portfolio.Portfolio;
import com.qerp.domain.portfolio.Position;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
public class JdbcPortfolioStore implements PortfolioStore {

    private final JdbcTemplate jdbcTemplate;

    public JdbcPortfolioStore(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Portfolio getPortfolio() {
        return loadPortfolio(false);
    }

    @Override
    public Portfolio getPortfolioForUpdate() {
        return loadPortfolio(true);
    }

    @Override
    public void updatePortfolio(Portfolio portfolio) {
        int updated = jdbcTemplate.update(
                "update portfolio_state set initial_equity = ?, cash_balance = ?, realized_pnl = ?, updated_at = ? where portfolio_id = 1",
                portfolio.initialEquity(),
                portfolio.cashBalance(),
                portfolio.realizedPnl(),
                Timestamp.from(Instant.now())
        );
        if (updated != 1) {
            throw new IllegalStateException("expected exactly one portfolio_state row to update");
        }

        jdbcTemplate.update("delete from portfolio_positions");
        for (Position position : portfolio.positions().values()) {
            jdbcTemplate.update(
                    "insert into portfolio_positions (symbol, quantity, average_price, updated_at) values (?, ?, ?, ?)",
                    position.symbol(),
                    position.quantity(),
                    position.averagePrice(),
                    Timestamp.from(Instant.now())
            );
        }
    }

    private Portfolio loadPortfolio(boolean forUpdate) {
        String stateSql = forUpdate
                ? "select initial_equity, cash_balance, realized_pnl from portfolio_state where portfolio_id = 1 for update"
                : "select initial_equity, cash_balance, realized_pnl from portfolio_state where portfolio_id = 1";

        List<PortfolioStateRow> states = jdbcTemplate.query(
                stateSql,
                (rs, rowNum) -> new PortfolioStateRow(
                        rs.getBigDecimal("initial_equity"),
                        rs.getBigDecimal("cash_balance"),
                        rs.getBigDecimal("realized_pnl")
                )
        );

        if (states.isEmpty()) {
            throw new IllegalStateException("portfolio state row missing");
        }

        List<Position> positions = jdbcTemplate.query(
                "select symbol, quantity, average_price from portfolio_positions",
                (rs, rowNum) -> new Position(
                        rs.getString("symbol"),
                        rs.getBigDecimal("quantity"),
                        rs.getBigDecimal("average_price")
                )
        );

        Map<String, Position> positionMap = new LinkedHashMap<>();
        for (Position position : positions) {
            positionMap.put(position.symbol(), position);
        }

        PortfolioStateRow state = states.getFirst();
        return new Portfolio(state.initialEquity(), state.cashBalance(), state.realizedPnl(), positionMap);
    }

    private record PortfolioStateRow(java.math.BigDecimal initialEquity, java.math.BigDecimal cashBalance, java.math.BigDecimal realizedPnl) {
    }
}
