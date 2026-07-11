package com.example.jira.dto;

public class TimeSummaryResponse {
    private final String scope;
    private final String scopeId;
    private final double totalHours;

    public TimeSummaryResponse(String scope, String scopeId, double totalHours) {
        this.scope = scope;
        this.scopeId = scopeId;
        this.totalHours = totalHours;
    }

    public String getScope() { return scope; }
    public String getScopeId() { return scopeId; }
    public double getTotalHours() { return totalHours; }
}
