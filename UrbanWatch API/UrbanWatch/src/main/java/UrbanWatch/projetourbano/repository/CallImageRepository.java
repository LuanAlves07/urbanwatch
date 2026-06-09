package  UrbanWatch.projetourbano.repository;
import  UrbanWatch.projetourbano.entity.CallImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CallImageRepository extends JpaRepository<CallImage, Long> {
}