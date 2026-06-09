package  UrbanWatch.projetourbano.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "call_images")
public class CallImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String imageUrl;

    @ManyToOne
    @JoinColumn(name = "call_id")
    private Call call;

    // Getters e Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Call getCall() { return call; }
    public void setCall(Call call) { this.call = call; }
}