package  UrbanWatch.projetourbano.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "votes")
public class Vote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Boolean value; // true = positivo, false = negativo

    @ManyToOne
    @JoinColumn(name = "call_id")
    private Call call;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    // Getters e Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Boolean getValue() { return value; }
    public void setValue(Boolean value) { this.value = value; }

    public Call getCall() { return call; }
    public void setCall(Call call) { this.call = call; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}