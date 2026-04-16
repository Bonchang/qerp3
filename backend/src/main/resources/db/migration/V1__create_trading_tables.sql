create sequence order_id_seq start with 1 increment by 1;

create table orders (
    sequence_id bigint primary key,
    order_id varchar(64) not null unique,
    symbol varchar(32) not null,
    side varchar(8) not null,
    order_type varchar(16) not null,
    quantity numeric(18, 6) not null,
    limit_price numeric(18, 2),
    status varchar(32) not null,
    filled_quantity numeric(18, 6) not null,
    remaining_quantity numeric(18, 6) not null,
    avg_fill_price numeric(18, 2),
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create index idx_orders_created_sequence_desc on orders (created_at desc, sequence_id desc);

create table portfolio_state (
    portfolio_id smallint primary key,
    initial_equity numeric(18, 2) not null,
    cash_balance numeric(18, 2) not null,
    realized_pnl numeric(18, 2) not null,
    updated_at timestamp with time zone not null
);

create table portfolio_positions (
    symbol varchar(32) primary key,
    quantity numeric(18, 6) not null,
    average_price numeric(18, 2) not null,
    updated_at timestamp with time zone not null
);

insert into portfolio_state (portfolio_id, initial_equity, cash_balance, realized_pnl, updated_at)
values (1, 100000.00, 100000.00, 0.00, current_timestamp);