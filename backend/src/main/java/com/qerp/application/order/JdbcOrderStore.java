package com.qerp.application.order;

import com.qerp.domain.order.Order;
import com.qerp.domain.order.OrderSide;
import com.qerp.domain.order.OrderStatus;
import com.qerp.domain.order.OrderType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Repository
public class JdbcOrderStore implements OrderStore {

    private final JdbcTemplate jdbcTemplate;

    public JdbcOrderStore(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public OrderRecord save(Order order) {
        Long sequenceId = jdbcTemplate.queryForObject("select nextval('order_id_seq')", Long.class);
        if (sequenceId == null) {
            throw new IllegalStateException("failed to allocate order sequence id");
        }
        String orderId = "ord_" + sequenceId;
        int inserted = jdbcTemplate.update(
                """
                insert into orders (
                    sequence_id, order_id, symbol, side, order_type, quantity, limit_price,
                    status, filled_quantity, remaining_quantity, avg_fill_price, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                sequenceId,
                orderId,
                order.symbol(),
                order.side().name(),
                order.orderType().name(),
                order.quantity(),
                order.limitPrice(),
                order.status().name(),
                order.filledQuantity(),
                order.remainingQuantity(),
                order.avgFillPrice(),
                Timestamp.from(order.createdAt()),
                Timestamp.from(order.updatedAt())
        );
        if (inserted != 1) {
            throw new IllegalStateException("expected exactly one order row to be inserted");
        }
        return new OrderRecord(orderId, order);
    }

    @Override
    public OrderRecord update(String orderId, Order order) {
        int updated = jdbcTemplate.update(
                """
                update orders
                set symbol = ?, side = ?, order_type = ?, quantity = ?, limit_price = ?, status = ?,
                    filled_quantity = ?, remaining_quantity = ?, avg_fill_price = ?, created_at = ?, updated_at = ?
                where order_id = ?
                """,
                order.symbol(),
                order.side().name(),
                order.orderType().name(),
                order.quantity(),
                order.limitPrice(),
                order.status().name(),
                order.filledQuantity(),
                order.remainingQuantity(),
                order.avgFillPrice(),
                Timestamp.from(order.createdAt()),
                Timestamp.from(order.updatedAt()),
                orderId
        );
        if (updated != 1) {
            throw new IllegalStateException("expected exactly one order row to be updated");
        }
        return new OrderRecord(orderId, order);
    }

    @Override
    public Optional<OrderRecord> findById(String orderId) {
        List<OrderRecord> results = jdbcTemplate.query(
                "select sequence_id, order_id, symbol, side, order_type, quantity, limit_price, status, filled_quantity, remaining_quantity, avg_fill_price, created_at, updated_at from orders where order_id = ?",
                orderRowMapper(),
                orderId
        );
        return results.stream().findFirst();
    }

    @Override
    public List<OrderRecord> findAll() {
        return jdbcTemplate.query(
                "select sequence_id, order_id, symbol, side, order_type, quantity, limit_price, status, filled_quantity, remaining_quantity, avg_fill_price, created_at, updated_at from orders order by created_at desc, sequence_id desc",
                orderRowMapper()
        );
    }

    private RowMapper<OrderRecord> orderRowMapper() {
        return (rs, rowNum) -> new OrderRecord(rs.getString("order_id"), toOrder(rs));
    }

    private Order toOrder(ResultSet rs) throws SQLException {
        return new Order(
                rs.getString("symbol"),
                OrderSide.valueOf(rs.getString("side")),
                OrderType.valueOf(rs.getString("order_type")),
                rs.getBigDecimal("quantity"),
                rs.getBigDecimal("limit_price"),
                OrderStatus.valueOf(rs.getString("status")),
                rs.getBigDecimal("filled_quantity"),
                rs.getBigDecimal("remaining_quantity"),
                rs.getBigDecimal("avg_fill_price"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("updated_at").toInstant()
        );
    }
}