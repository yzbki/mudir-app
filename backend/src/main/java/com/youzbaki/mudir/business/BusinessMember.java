package com.youzbaki.mudir.business;

import com.youzbaki.mudir.user.User;
import jakarta.persistence.*;

@Entity
@Table(
        name = "business_members",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"business_id", "user_id"})
        }
)
public class BusinessMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "business_id", nullable = false)
    private Business business;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BusinessRole role;

    public BusinessMember() {
    }

    public BusinessMember(Business business, User user, BusinessRole role) {
        this.business = business;
        this.user = user;
        this.role = role;
    }

    public Long getId() {
        return id;
    }

    public Business getBusiness() {
        return business;
    }

    public void setBusiness(Business business) {
        this.business = business;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public BusinessRole getRole() {
        return role;
    }

    public void setRole(BusinessRole role) {
        this.role = role;
    }
}
