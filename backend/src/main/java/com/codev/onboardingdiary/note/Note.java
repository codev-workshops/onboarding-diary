package com.codev.onboardingdiary.note;

import com.codev.onboardingdiary.diary.DiaryEntry;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.hibernate.annotations.BatchSize;

@Entity
@Table(name = "notes")
public class Note extends DiaryEntry {

  @Column(nullable = false, length = 150)
  private String title;

  @Column(nullable = false, length = 20000)
  private String content;

  @Column(nullable = false)
  private boolean shared;

  @ElementCollection
  @CollectionTable(name = "note_tags", joinColumns = @JoinColumn(name = "note_id"))
  @Column(name = "tag", length = 40, nullable = false)
  @BatchSize(size = 50)
  private Set<String> tags = new HashSet<>();

  protected Note() {}

  public Note(Long ownerId) {
    super(ownerId);
  }

  public void update(
      LocalDate entryDate, String title, String content, boolean shared, Collection<String> tags) {
    setEntryDate(entryDate);
    this.title = title;
    this.content = content;
    this.shared = shared;
    this.tags.clear();
    this.tags.addAll(tags);
  }

  public String getTitle() {
    return title;
  }

  public String getContent() {
    return content;
  }

  public boolean isShared() {
    return shared;
  }

  public List<String> getTags() {
    return tags.stream().sorted().toList();
  }
}
