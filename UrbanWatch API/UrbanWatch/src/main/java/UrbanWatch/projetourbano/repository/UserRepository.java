package  UrbanWatch.projetourbano.repository;

import  UrbanWatch.projetourbano.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}
