package  UrbanWatch.projetourbano.repository;

import  UrbanWatch.projetourbano.entity.Call;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CallRepository extends JpaRepository<Call, Long> {}
