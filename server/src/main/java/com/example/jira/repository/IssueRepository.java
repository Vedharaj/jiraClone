package com.example.jira.repository;

import com.example.jira.model.Issue;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.time.Instant;

public interface IssueRepository extends MongoRepository<Issue, ObjectId> {

    List<Issue> findByProjectId(String projectId);

    List<Issue> findByParentTaskId(String parentTaskId);

    List<Issue> findByDependencyIdsContaining(String dependencyId);

    List<Issue> findBySprintId(String sprintId);

    List<Issue> findByIsSubtaskTrue();

    List<Issue> findByIsSubtaskFalse();

    List<Issue> findByDueDateBetweenAndStatusNot(Instant start, Instant end, String status);
}
