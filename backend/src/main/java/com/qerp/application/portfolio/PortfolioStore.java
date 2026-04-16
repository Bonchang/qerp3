package com.qerp.application.portfolio;

import com.qerp.domain.portfolio.Portfolio;

public interface PortfolioStore {

    Portfolio getPortfolio();

    Portfolio getPortfolioForUpdate();

    void updatePortfolio(Portfolio portfolio);
}