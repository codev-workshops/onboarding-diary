package com.codev.onboardingdiary.entry.note;

import com.codev.onboardingdiary.entry.EntryBase;
import com.codev.onboardingdiary.user.User;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.Set;

/** A free-form note with optional tags. */
@Entity
@Table(name = "notes")
public class Note extends EntryBase {

  @Column(nullable = false, length = 120)
  private String title;

  @Column(nullable = false, length = 10000)
  private String content;

  @ElementCollection
  @CollectionTable(name = "note_tags", joinColumns = @JoinColumn(name = "note_id"))
  @Column(name = "tag", nullable = false, length = 30)
  @OrderBy
  private Set<String> tags = new LinkedHashSet<>();

  protected Note() {}

  public Note(User owner) {
    super(owner);
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }

  public Set<String> getTags() {
    return Set.copyOf(tags);
  }

  public void replaceTags(Collection<String> newTags) {
    tags.clear();
    tags.addAll(newTags);
  }
}
