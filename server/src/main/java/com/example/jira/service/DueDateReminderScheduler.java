package com.example.jira.service;

import com.example.jira.model.Issue;
import com.example.jira.repository.IssueRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class DueDateReminderScheduler {
    private final IssueRepository issueRepository;
    private final NotificationService notificationService;

    public DueDateReminderScheduler(IssueRepository issueRepository, NotificationService notificationService) {
        this.issueRepository = issueRepository;
        this.notificationService = notificationService;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void sendDueDateReminders() {
        Instant start = Instant.now().plus(23, ChronoUnit.HOURS);
        Instant end = Instant.now().plus(25, ChronoUnit.HOURS);
        List<Issue> dueSoon = issueRepository.findByDueDateBetweenAndStatusNot(start, end, "DONE");

        for (Issue issue : dueSoon) {
            if (issue.getAssigneeId() == null) {
                continue;
            }
            notificationService.notifyUser(
                    issue.getAssigneeId(),
                    "Task due soon",
                    "\"" + issue.getTitle() + "\" is due in about 24 hours.",
                    "DUE_DATE_REMINDER",
                    issue.getId(),
                    issue.getProjectId(),
                    "DUE_DATE_REMINDER:" + issue.getId());
        }
    }
}
